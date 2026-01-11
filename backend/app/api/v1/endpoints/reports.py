from typing import Any, List, Optional
from datetime import date
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from pydantic import BaseModel

from app.api import deps
from app.models import Transaction, Account, User, TransactionType, TransactionRead
from app.models.user import UserRole

router = APIRouter()

class ReportRequest(BaseModel):
    account_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    skip: int = 0
    limit: int = 100

class CategoryReportRequest(ReportRequest):
    category_ids: List[UUID] = []

class TypeReportRequest(ReportRequest):
    types: List[TransactionType] = []

class ReportResponse(BaseModel):
    total: Decimal
    transactions: List[TransactionRead]

@router.post("/category", response_model=ReportResponse)
async def get_category_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request: CategoryReportRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get transactions filtered by categories with total sum.
    """
    try:
        # Base query
        if current_user.permission == UserRole.ADMIN:
            query = select(Transaction)
        else:
            query = select(Transaction).join(Account).where(Account.user_id == current_user.id)
        
        # Apply filters
        if request.account_id:
            query = query.where(Transaction.account_id == request.account_id)
        
        if request.start_date:
            query = query.where(Transaction.date >= request.start_date)
        if request.end_date:
            query = query.where(Transaction.date <= request.end_date)
            
        if request.category_ids:
            query = query.where(Transaction.category_id.in_(request.category_ids))
            
        # Execute main query for transactions
        query = query.order_by(Transaction.date.desc())
        query = query.offset(request.skip).limit(request.limit)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate total
        # For total, we need to run a query without limit/offset
        if current_user.permission == UserRole.ADMIN:
            count_query = select(func.sum(Transaction.amount))
        else:
            count_query = select(func.sum(Transaction.amount)).join(Account).where(Account.user_id == current_user.id)
            
        if request.account_id:
            count_query = count_query.where(Transaction.account_id == request.account_id)
        if request.start_date:
            count_query = count_query.where(Transaction.date >= request.start_date)
        if request.end_date:
            count_query = count_query.where(Transaction.date <= request.end_date)
        if request.category_ids:
            count_query = count_query.where(Transaction.category_id.in_(request.category_ids))
            
        sum_result = await db.execute(count_query)
        total = sum_result.scalar() or Decimal(0)
        
        return ReportResponse(total=total, transactions=transactions)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/type", response_model=ReportResponse)
async def get_type_report(
    *,
    db: AsyncSession = Depends(deps.get_db),
    request: TypeReportRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get transactions filtered by types with total sum.
    """
    try:
        # Base query
        if current_user.permission == UserRole.ADMIN:
            query = select(Transaction)
        else:
            query = select(Transaction).join(Account).where(Account.user_id == current_user.id)
        
        # Apply filters
        if request.account_id:
            query = query.where(Transaction.account_id == request.account_id)
        
        if request.start_date:
            query = query.where(Transaction.date >= request.start_date)
        if request.end_date:
            query = query.where(Transaction.date <= request.end_date)
            
        if request.types:
            query = query.where(Transaction.type.in_(request.types))
            
        # Execute main query for transactions
        query = query.order_by(Transaction.date.desc())
        query = query.offset(request.skip).limit(request.limit)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate total
        if current_user.permission == UserRole.ADMIN:
            count_query = select(func.sum(Transaction.amount))
        else:
            count_query = select(func.sum(Transaction.amount)).join(Account).where(Account.user_id == current_user.id)
            
        if request.account_id:
            count_query = count_query.where(Transaction.account_id == request.account_id)
        if request.start_date:
            count_query = count_query.where(Transaction.date >= request.start_date)
        if request.end_date:
            count_query = count_query.where(Transaction.date <= request.end_date)
        if request.types:
            count_query = count_query.where(Transaction.type.in_(request.types))
            
        sum_result = await db.execute(count_query)
        total = sum_result.scalar() or Decimal(0)
        
        return ReportResponse(total=total, transactions=transactions)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
