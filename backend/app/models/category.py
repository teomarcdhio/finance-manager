from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel

class CategoryBase(SQLModel):
    name: str = Field(unique=True, index=True)
    description: Optional[str] = None

class Category(CategoryBase, table=True):
    id: Optional[UUID] = Field(default_factory=uuid4, primary_key=True)

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryRead(CategoryBase):
    id: UUID
