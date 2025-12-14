from typing import Any, List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from datetime import date as date_type
from decimal import Decimal

from app.api import deps
from app.models import Account, AccountCreate, AccountRead, AccountUpdate, User, Transaction, TransactionType, TransactionRead
from app.models.user import UserRole

router = APIRouter()

@router.get("/", response_model=List[AccountRead])
async def read_accounts(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve accounts.
    """
    try:
        if current_user.permission == UserRole.ADMIN:
            query = select(Account).offset(skip).limit(limit)
        else:
            query = select(Account).where(Account.user_id == current_user.id).offset(skip).limit(limit)
            
        result = await db.execute(query)
        accounts = result.scalars().all()
        return accounts
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=AccountRead)
async def create_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_in: AccountCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new account.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        account = Account.model_validate(account_in, update={"user_id": current_user.id})
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}", response_model=AccountRead)
async def read_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get account by ID.
    """
    try:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=400, detail="Not enough permissions")
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{account_id}", response_model=AccountRead)
async def update_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    account_in: AccountUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an account.
    """
    try:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        update_data = account_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(account, field, value)

        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}", response_model=AccountRead)
async def delete_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an account.
    """
    try:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        await db.delete(account)
        await db.commit()
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}/balance", response_model=Decimal)
async def get_account_balance(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    target_date: date_type = Query(default_factory=date_type.today),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get account balance at a specific date.
    """
    try:
        # Fetch account
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Calculate balance
        balance = account.initial_balance
        
        if target_date >= account.balance_date:
            # Add transactions between balance_date (exclusive) and target_date (inclusive)
            query = select(Transaction).where(
                Transaction.account_id == account_id,
                Transaction.date > account.balance_date,
                Transaction.date <= target_date
            )
            result = await db.execute(query)
            transactions = result.scalars().all()
            
            for txn in transactions:
                print(f"Processing transaction: {txn.name}, Type: {txn.type}, Amount: {txn.amount}, Date: {txn.date}")
                if txn.type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                    balance += txn.amount
                    print(f"Added {txn.amount}. New Balance: {balance}")
                else:
                    balance -= txn.amount
                    print(f"Subtracted {txn.amount}. New Balance: {balance}")
        else:
            # Subtract transactions between target_date (exclusive) and balance_date (inclusive)
            # Because we are moving backwards in time from the known balance point
            query = select(Transaction).where(
                Transaction.account_id == account_id,
                Transaction.date > target_date,
                Transaction.date <= account.balance_date
            )
            result = await db.execute(query)
            transactions = result.scalars().all()
            
            for txn in transactions:
                if txn.type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                    balance -= txn.amount # Reverse the effect
                else:
                    balance += txn.amount # Reverse the effect

        return balance
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{account_id}/transactions/sum", response_model=Decimal)
async def get_account_transaction_sum(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    start_date: Optional[date_type] = Query(None),
    end_date: Optional[date_type] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get net total amount of all transactions for an account in a date range.
    """
    try:
        # Fetch account to check permissions
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Calculate sum
        query = select(Transaction).where(Transaction.account_id == account_id)
        
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        total = Decimal(0)
        for txn in transactions:
            if txn.type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                total += txn.amount
            else:
                total -= txn.amount
        
        return total
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}/transactions/type", response_model=List[TransactionRead])
async def get_account_transactions_by_type(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    type: TransactionType,
    start_date: Optional[date_type] = Query(None),
    end_date: Optional[date_type] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all transactions of a specific type for an account within a date range.
    """
    try:
        # Fetch account to check permissions
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        query = select(Transaction).where(
            Transaction.account_id == account_id,
            Transaction.type == type
        )

        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)

        result = await db.execute(query)
        transactions = result.scalars().all()
        return transactions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}/transactions/type/sum", response_model=Decimal)
async def get_account_transaction_sum_by_type(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    type: TransactionType,
    start_date: Optional[date_type] = Query(None),
    end_date: Optional[date_type] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get total amount of transactions of a specific type for an account in a date range.
    """
    try:
        # Fetch account to check permissions
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Calculate sum
        query = select(func.sum(Transaction.amount)).where(
            Transaction.account_id == account_id,
            Transaction.type == type
        )
        
        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
        
        result = await db.execute(query)
        total = result.scalar()
        
        return total if total is not None else Decimal(0)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}/transactions/target", response_model=List[TransactionRead])
async def get_account_transactions_by_target(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    target_account: str,
    start_date: Optional[date_type] = Query(None),
    end_date: Optional[date_type] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all transactions for a specific target account within a date range.
    """
    try:
        # Fetch account to check permissions
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        query = select(Transaction).where(
            Transaction.account_id == account_id,
            Transaction.target_account.ilike(target_account)
        )

        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)

        result = await db.execute(query)
        transactions = result.scalars().all()
        return transactions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{account_id}/transactions/target/sum", response_model=Decimal)
async def get_account_transactions_sum_by_target(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    target_account: str,
    start_date: Optional[date_type] = Query(None),
    end_date: Optional[date_type] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get total amount of transactions for a specific target account within a date range.
    """
    try:
        # Fetch account to check permissions
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        query = select(func.sum(Transaction.amount)).where(
            Transaction.account_id == account_id,
            Transaction.target_account.ilike(target_account)
        )

        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)

        result = await db.execute(query)
        total = result.scalar()
        
        return total if total is not None else Decimal(0)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
