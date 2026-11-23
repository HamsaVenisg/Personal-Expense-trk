from unittest.mock import MagicMock, Mock

import pytest

from app import database


@pytest.fixture(autouse=True)
def clear_cached_engine():
    database.get_engine.cache_clear()
    yield
    database.get_engine.cache_clear()


@pytest.mark.parametrize('value', ['', 'invalid secret-marker', 'sqlite:///app.db',
                                    'postgresql+psycopg://user:YOUR_PASSWORD@YOUR_POOLER_HOST/db',
                                    'postgresql://user:secret-marker@localhost/db?host=/tmp'])
def test_invalid_database_config_is_rejected_without_exposing_values(monkeypatch, value):
    monkeypatch.setenv('DATABASE_URL', value)
    with pytest.raises(database.DatabaseConfigurationError) as failure:
        database.get_engine()
    assert 'secret-marker' not in str(failure.value)


@pytest.mark.parametrize('requested, effective', [('prefer', 'require'), ('verify-full', 'verify-full')])
def test_engine_uses_psycopg_and_enforces_ssl(monkeypatch, requested, effective):
    monkeypatch.setenv('DATABASE_URL', f'postgresql://example:fake-password@localhost/test?sslmode={requested}')
    create_engine = Mock()
    monkeypatch.setattr(database, 'create_engine', create_engine)
    database.get_engine()
    url, = create_engine.call_args.args
    options = create_engine.call_args.kwargs
    assert url.drivername == 'postgresql+psycopg'
    assert url.query['sslmode'] == effective
    assert options['pool_pre_ping'] is True
    assert options['hide_parameters'] is True
    assert options['connect_args'] == {'connect_timeout': 10, 'gssencmode': 'disable'}


def test_connectivity_check_only_executes_select_one():
    engine = MagicMock()
    connection = engine.connect.return_value.__enter__.return_value
    database.check_database(engine)
    statement, = connection.execute.call_args.args
    assert str(statement) == 'SELECT 1'
    connection.execute.assert_called_once()
    connection.commit.assert_not_called()
    engine.connect.return_value.__exit__.assert_called_once()
