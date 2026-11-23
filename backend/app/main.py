import csv
import io
import os
from calendar import monthrange
from contextlib import asynccontextmanager
from datetime import date
from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError, IntegrityError, OperationalError, SQLAlchemyError, TimeoutError
from sqlalchemy.orm import Session
from .database import Base, check_database, get_db, get_engine, log_database_error, logger
from .models import Budget, Transaction, User
from .schemas import BudgetIn, BudgetOut, Login, SummaryOut, TokenOut, TransactionIn, TransactionOut, UserCreate, UserOut
from .security import get_current_user, jwt_secret, make_token, password_hash, verify_password

@asynccontextmanager
async def lifespan(app: FastAPI):
    jwt_secret()
    engine = get_engine()
    try:
        try:
            check_database(engine)
        except SQLAlchemyError as error:
            log_database_error('Database startup connectivity check', error)
            raise RuntimeError('Database connection failed. Check connectivity and backend/.env.') from None
        logger.info('Database startup connectivity check passed.')
        try:
            Base.metadata.create_all(bind=engine)
        except SQLAlchemyError as error:
            log_database_error('Database schema initialization', error)
            raise RuntimeError('Database schema initialization failed. Check database permissions.') from None
        yield
    finally:
        engine.dispose()

app = FastAPI(title='Personal Expenses Tracker API', version='1.0.0', lifespan=lifespan)
origins = [x.strip() for x in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])

@app.exception_handler(SQLAlchemyError)
async def database_failure(request: Request, error: SQLAlchemyError):
    log_database_error(f'Database request ({request.method})', error)
    unavailable = isinstance(error, (OperationalError, TimeoutError)) or (
        isinstance(error, DBAPIError) and error.connection_invalidated
    )
    return JSONResponse(
        status_code=503 if unavailable else 500,
        content={'detail': 'Database temporarily unavailable' if unavailable else 'Database operation failed'},
    )

@app.get('/api/health')
def health():
    return {'status': 'ok'}

@app.post('/api/auth/register', response_model=TokenOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    user = User(name=payload.name.strip(), email=email, password_hash=password_hash.hash(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='An account with this email already exists')
    return TokenOut(access_token=make_token(user.id), user=user)

@app.post('/api/auth/login', response_model=TokenOut)
def login(payload: Login, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Incorrect email or password')
    return TokenOut(access_token=make_token(user.id), user=user)

@app.get('/api/auth/me', response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user

def scoped_transaction(db: Session, user: User, transaction_id: int) -> Transaction:
    record = db.scalar(select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user.id))
    if not record:
        raise HTTPException(status_code=404, detail='Transaction not found')
    return record

@app.get('/api/transactions', response_model=list[TransactionOut])
def list_transactions(month: str | None = Query(default=None, pattern=r'^\d{4}-(0[1-9]|1[0-2])$'), kind: str | None = Query(default=None, pattern=r'^(income|expense)$'), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if month:
        stmt = stmt.where(transaction_month(month))
    if kind:
        stmt = stmt.where(Transaction.kind == kind)
    return db.scalars(stmt.order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).limit(1000)).all()

def transaction_month(month: str):
    year, mo = map(int, month.split('-'))
    try:
        first = date(year, mo, 1)
    except ValueError:
        raise HTTPException(status_code=422, detail='Invalid month') from None
    return Transaction.transaction_date.between(first, date(year, mo, monthrange(year, mo)[1]))

@app.post('/api/transactions', response_model=TransactionOut, status_code=201)
def add_transaction(payload: TransactionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = Transaction(**payload.model_dump(), user_id=user.id)
    db.add(record)
    db.commit()
    return record

@app.put('/api/transactions/{transaction_id}', response_model=TransactionOut)
def update_transaction(transaction_id: int, payload: TransactionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = scoped_transaction(db, user, transaction_id)
    for key, value in payload.model_dump().items():
        setattr(record, key, value)
    db.commit()
    return record

@app.delete('/api/transactions/{transaction_id}', status_code=204)
def delete_transaction(transaction_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(scoped_transaction(db, user, transaction_id))
    db.commit()
    return Response(status_code=204)

@app.get('/api/summary', response_model=SummaryOut)
def summary(month: str = Query(pattern=r'^\d{4}-(0[1-9]|1[0-2])$'), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Transaction).where(Transaction.user_id == user.id, transaction_month(month))).all()
    income = sum((r.amount for r in rows if r.kind == 'income'), Decimal('0'))
    expenses = sum((r.amount for r in rows if r.kind == 'expense'), Decimal('0'))
    totals: dict[str, Decimal] = {}
    for record in rows:
        if record.kind == 'expense':
            totals[record.category] = totals.get(record.category, Decimal('0')) + record.amount
    return {'month': month, 'income': income, 'expenses': expenses, 'balance': income - expenses, 'by_category': [{'category': k, 'amount': v} for k, v in sorted(totals.items(), key=lambda x: -x[1])]}

@app.get('/api/budgets', response_model=list[BudgetOut])
def list_budgets(month: str = Query(pattern=r'^\d{4}-(0[1-9]|1[0-2])$'), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Budget).where(Budget.user_id == user.id, Budget.month == month).order_by(Budget.category)).all()

@app.put('/api/budgets', response_model=BudgetOut)
def upsert_budget(payload: BudgetIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lookup = select(Budget).where(Budget.user_id == user.id, Budget.month == payload.month, Budget.category == payload.category)
    record = db.scalar(lookup)
    if record is None:
        try:
            with db.begin_nested():
                record = Budget(**payload.model_dump(), user_id=user.id)
                db.add(record)
        except IntegrityError as error:
            # A concurrent request may have inserted this budget after the lookup.
            if getattr(getattr(error.orig, 'diag', None), 'constraint_name', None) != 'uq_user_category_month':
                raise
            record = db.scalar(lookup)
            if record is None:
                raise HTTPException(status_code=409, detail='Budget changed concurrently. Please retry.') from None
    record.limit_amount = payload.limit_amount
    db.commit()
    return record

@app.delete('/api/budgets/{budget_id}', status_code=204)
def delete_budget(budget_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.scalar(select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id))
    if not record:
        raise HTTPException(status_code=404, detail='Budget not found')
    db.delete(record)
    db.commit()
    return Response(status_code=204)

@app.get('/api/export/csv')
def export_csv(expenses_only: bool = False, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if expenses_only:
        stmt = stmt.where(Transaction.kind == 'expense')
    records = db.scalars(stmt.order_by(Transaction.transaction_date.desc())).all()
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(['id', 'date', 'type', 'category', 'amount', 'description'])
    for r in records:
        writer.writerow([r.id, r.transaction_date.isoformat(), r.kind, r.category, str(r.amount), r.description])
    return Response(content=stream.getvalue(), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename="expenses.csv"'})
