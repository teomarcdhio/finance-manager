from typing import Optional
from uuid import UUID, uuid4
from datetime import date
from decimal import Decimal
from sqlmodel import Field, SQLModel

class AccountBase(SQLModel):
    name: str
    account_number: Optional[str] = None
    bank_name: str
    initial_balance: Decimal
    balance_date: date
    user_id: UUID = Field(foreign_key="user.id")

class Account(AccountBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

class AccountCreate(AccountBase):
    pass

class AccountUpdate(AccountBase):
    name: Optional[str] = None
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    initial_balance: Optional[Decimal] = None
    balance_date: Optional[date] = None
    user_id: Optional[UUID] = None

class AccountRead(AccountBase):
    id: UUID
