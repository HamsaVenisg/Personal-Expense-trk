import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError

from app import database, main


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(URL.create('sqlite', database=str(tmp_path / 'test.db')))
    monkeypatch.setattr(database, 'get_engine', lambda: engine)
    monkeypatch.setattr(main, 'get_engine', lambda: engine)
    monkeypatch.setenv('JWT_SECRET', 'isolated-api-tests-only-secret-with-no-production-use')

    @event.listens_for(engine, 'connect')
    def enable_foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')

    with TestClient(main.app) as test_client:
        yield test_client, engine


def register(client, name='Alex', email='alex@example.com'):
    result = client.post('/api/auth/register', json={'name': name, 'email': email, 'password': 'safe-pass-123'})
    assert result.status_code == 201, result.text
    return {'Authorization': f"Bearer {result.json()['access_token']}"}


def test_full_expense_flow_and_isolation(client):
    client, _ = client
    assert client.get('/api/health').json()['status'] == 'ok'
    alex = register(client)
    robin = register(client, 'Robin', 'robin@example.com')
    tx = {'kind': 'expense', 'amount': '149.50', 'category': 'Food', 'description': 'Lunch', 'transaction_date': '2026-11-18'}
    added = client.post('/api/transactions', json=tx, headers=alex)
    assert added.status_code == 201, added.text
    tid = added.json()['id']
    assert client.get('/api/transactions?month=2026-11', headers=robin).json() == []
    assert client.put(f'/api/transactions/{tid}', json=tx, headers=robin).status_code == 404
    assert client.delete(f'/api/transactions/{tid}', headers=robin).status_code == 404
    updated = client.put(f'/api/transactions/{tid}', json={**tx, 'description': 'Updated lunch'}, headers=alex)
    assert updated.status_code == 200
    assert updated.json()['description'] == 'Updated lunch'
    summary = client.get('/api/summary?month=2026-11', headers=alex).json()
    assert float(summary['expenses']) == 149.50
    assert float(summary['balance']) == -149.50
    assert float(client.get('/api/summary?month=2026-11', headers=robin).json()['expenses']) == 0
    budget = {'category': 'Food', 'month': '2026-11', 'limit_amount': '2000'}
    saved = client.put('/api/budgets', headers=alex, json=budget)
    assert saved.status_code == 200
    budget_id = saved.json()['id']
    assert client.get('/api/budgets?month=2026-11', headers=robin).json() == []
    assert client.delete(f'/api/budgets/{budget_id}', headers=robin).status_code == 404
    assert client.put('/api/budgets', headers=robin, json=budget).json()['id'] != budget_id
    assert client.put('/api/budgets', headers=alex, json={**budget, 'limit_amount': '2500'}).json()['id'] == budget_id
    budgets = client.get('/api/budgets?month=2026-11', headers=alex).json()
    assert len(budgets) == 1 and float(budgets[0]['limit_amount']) == 2500
    assert client.delete(f'/api/budgets/{budget_id}', headers=alex).status_code == 204
    csv_data = client.get('/api/export/csv', headers=alex).text
    assert 'Updated lunch' in csv_data and '149.50' in csv_data
    assert 'Updated lunch' not in client.get('/api/export/csv', headers=robin).text
    assert client.delete(f'/api/transactions/{tid}', headers=alex).status_code == 204
    assert client.get('/api/transactions?month=2026-11', headers=alex).json() == []


def test_auth_and_validation(client):
    client, _ = client
    assert client.get('/api/transactions').status_code == 401
    assert client.post('/api/auth/login', json={'email': 'nobody@example.com', 'password': 'bad'}).status_code == 401
    assert client.post('/api/auth/register', json={'name': 'A', 'email': 'invalid', 'password': 'short'}).status_code == 422
    assert client.get('/api/summary?month=2026-13').status_code == 401
    headers = register(client)
    assert client.get('/api/auth/me', headers=headers).json()['email'] == 'alex@example.com'
    login = client.post('/api/auth/login', json={'email': 'ALEX@example.com', 'password': 'safe-pass-123'})
    assert login.status_code == 200 and login.json()['user']['email'] == 'alex@example.com'
    assert client.post('/api/auth/register', json={'name': 'Alex', 'email': 'ALEX@example.com', 'password': 'safe-pass-123'}).status_code == 409
    assert client.get('/api/summary?month=0000-01', headers=headers).status_code == 422
    assert client.get('/api/transactions?month=9999-12', headers=headers).json() == []


def test_failed_write_rolls_back_and_hides_driver_error(client, caplog):
    client, engine = client
    headers = register(client)
    payload = {'kind': 'expense', 'amount': '10', 'category': 'Food', 'transaction_date': '2026-11-18'}
    private_marker = 'simulated-private-driver-details'

    def fail_commit(_):
        raise OperationalError(None, None, RuntimeError(private_marker))

    event.listen(engine, 'commit', fail_commit)
    try:
        response = client.post('/api/transactions', headers=headers, json=payload)
    finally:
        event.remove(engine, 'commit', fail_commit)
    assert response.status_code == 503
    assert private_marker not in response.text
    assert private_marker not in caplog.text
    assert 'Database request (POST) failed' in caplog.text
    assert client.get('/api/transactions', headers=headers).json() == []
    assert client.post('/api/transactions', headers=headers, json=payload).status_code == 201
