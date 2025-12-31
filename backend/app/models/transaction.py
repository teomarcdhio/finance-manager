from typing import Optional, Any, Dict
from uuid import UUID, uuid4
from datetime import date as dt_date
from decimal import Decimal
from enum import Enum
from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class TransactionType(str, Enum):
    PAYMENT = "payment"
    WITHDRAW = "withdraw"
    DEPOSIT = "deposit"
    INTEREST = "interest"
    TRANSFER = "transfer"

class TransactionBase(SQLModel):
    name: str
    type: TransactionType
    amount: Decimal
    target_account: str
    account_id: UUID = Field(foreign_key="account.id")
    date: dt_date
    recurrency: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))

class Transaction(TransactionBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = None
    target_account: Optional[str] = None
    account_id: Optional[UUID] = None
    date: Optional[dt_date] = None
    recurrency: Optional[Dict[str, Any]] = None

class TransactionRead(TransactionBase):
    id: UUID
