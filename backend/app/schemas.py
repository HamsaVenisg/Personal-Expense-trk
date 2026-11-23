from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Money = Decimal

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class Login(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr

class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut

class TransactionIn(BaseModel):
    kind: Literal['income', 'expense']
    amount: Money = Field(gt=0, le=9999999999, decimal_places=2)
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(default='', max_length=300)
    transaction_date: date

    @field_validator('category')
    @classmethod
    def clean_category(cls, val: str) -> str:
        return val.strip()

class TransactionOut(TransactionIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class BudgetIn(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    month: str = Field(pattern=r'^\d{4}-(0[1-9]|1[0-2])$')
    limit_amount: Money = Field(gt=0, le=9999999999, decimal_places=2)

    @field_validator('category')
    @classmethod
    def clean_category(cls, val: str) -> str:
        return val.strip()

class BudgetOut(BudgetIn):
    model_config = ConfigDict(from_attributes=True)
    id: int

class CategoryTotal(BaseModel):
    category: str
    amount: Decimal

class SummaryOut(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    balance: Decimal
    by_category: list[CategoryTotal]
