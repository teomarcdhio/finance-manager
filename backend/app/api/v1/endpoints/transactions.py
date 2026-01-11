from typing import Any, List, Optional
from datetime import date
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
import csv
import io
import json

from app.api import deps
from app.models import Transaction, TransactionCreate, TransactionRead, TransactionUpdate, Account, User, TransactionType
from app.models.user import UserRole
from app.services.recurrence import process_recurrence

router = APIRouter()

@router.get("/", response_model=List[TransactionRead])
async def read_transactions(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    account_id: Optional[UUID] = Query(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve transactions.
    """
    try:
        if current_user.permission == UserRole.ADMIN:
            query = select(Transaction)
        else:
            # Join with Account to filter by user_id
            query = select(Transaction).join(Account).where(Account.user_id == current_user.id)
        
        if account_id:
            query = query.where(Transaction.account_id == account_id)

        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)
            
        query = query.order_by(Transaction.date.desc())
        query = query.offset(skip).limit(limit)
            
        result = await db.execute(query)
        transactions = result.scalars().all()
        return transactions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=TransactionRead)
async def create_transaction(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transaction_in: TransactionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new transaction.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Verify account belongs to user
        result = await db.execute(select(Account).where(Account.id == transaction_in.account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=400, detail="Not enough permissions")

        # Auto-assign category from target account if not provided
        if not transaction_in.category_id and transaction_in.target_account_id:
            result = await db.execute(select(Account).where(Account.id == transaction_in.target_account_id))
            target_account = result.scalars().first()
            if target_account and target_account.category_id:
                transaction_in.category_id = target_account.category_id

        transaction = Transaction.model_validate(transaction_in)
        
        # Enforce sign based on transaction type
        if transaction.type in [TransactionType.EXPENSE, TransactionType.WITHDRAW, TransactionType.TRANSFER]:
            # These should be negative (outgoing)
            if transaction.amount > 0:
                transaction.amount = -transaction.amount
        elif transaction.type in [TransactionType.INCOME]:
            # These should be positive (incoming)
            if transaction.amount < 0:
                transaction.amount = -transaction.amount

        db.add(transaction)
        
        # Process recurrence
        if transaction.recurrency:
            await process_recurrence(transaction, db)

        await db.commit()
        await db.refresh(transaction)
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    account_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Bulk import transactions from CSV.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        content = await file.read()
        decoded_content = content.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        rows = list(csv_reader)
        
        # Process destination accounts
        target_account_names = set()
        for row in rows:
            if row.get("target_account"):
                target_account_names.add(row["target_account"])
        
        target_account_map = {}
        for name in target_account_names:
            # Check if exists (case-insensitive)
            query = select(Account).where(
                func.lower(Account.name) == func.lower(name),
                Account.user_id == None
            )
            result = await db.execute(query)
            account = result.scalars().first()
            
            if not account:
                # Create new destination account
                account = Account(
                    name=name,
                    initial_balance=Decimal(0),
                    balance_date=date.today(),
                    currency="USD",
                    user_id=None
                )
                db.add(account)
                await db.commit()
                await db.refresh(account)
            
            target_account_map[name] = account.id

        transactions_to_create = []
        errors = []
        
        row_index = 0
        for row in rows:
            row_index += 1
            try:
                # Handle target_account mapping
                if row.get("target_account"):
                    target_name = row["target_account"]
                    if target_name in target_account_map:
                        row["target_account_id"] = str(target_account_map[target_name])
                    del row["target_account"]

                # Check account ownership
                row_account_id = row.get("account_id")
                if not row_account_id:
                    if account_id:
                        row["account_id"] = str(account_id)
                    else:
                        errors.append(f"Row {row_index}: Missing account_id")
                        continue

                # Handle recurrency JSON string
                if row.get("recurrency"):
                    try:
                        row["recurrency"] = json.loads(row["recurrency"])
                    except json.JSONDecodeError:
                        errors.append(f"Row {row_index}: Invalid JSON in recurrency field")
                        continue
                else:
                    row["recurrency"] = None

                # Let's use TransactionCreate to validate
                transaction_in = TransactionCreate(**row)
                transactions_to_create.append(transaction_in)
                
            except Exception as e:
                errors.append(f"Row {row_index}: {str(e)}")

        if errors:
            return {"status": "error", "message": "Validation failed", "errors": errors}

        # Verify ownership of all accounts involved
        account_ids = {t.account_id for t in transactions_to_create}
        query = select(Account.id).where(Account.user_id == current_user.id).where(Account.id.in_(account_ids))
        result = await db.execute(query)
        owned_account_ids = result.scalars().all()
        
        if len(owned_account_ids) != len(account_ids) and current_user.permission != UserRole.ADMIN:
            return {"status": "error", "message": "One or more accounts do not belong to the user"}

        # Insert all
        try:
            for transaction_in in transactions_to_create:
                transaction = Transaction.model_validate(transaction_in)
                
                # Enforce sign based on transaction type
                if transaction.type in [TransactionType.EXPENSE, TransactionType.WITHDRAW, TransactionType.TRANSFER]:
                    # These should be negative (outgoing)
                    if transaction.amount > 0:
                        transaction.amount = -transaction.amount
                elif transaction.type in [TransactionType.INCOME, TransactionType.INTEREST]:
                    # These should be positive (incoming)
                    if transaction.amount < 0:
                        transaction.amount = -transaction.amount

                db.add(transaction)
            await db.commit()
        except Exception as e:
            await db.rollback()
            return {"status": "error", "message": f"Database error: {str(e)}"}

        return {"status": "success", "message": f"Imported {len(transactions_to_create)} transactions"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transaction_id: UUID,
    transaction_in: TransactionUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a transaction.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
        transaction = result.scalars().first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Check if user owns the current account of the transaction
        result = await db.execute(select(Account).where(Account.id == transaction.account_id))
        current_account = result.scalars().first()
        if current_account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # If updating account_id, check if user owns the new account
        if transaction_in.account_id:
            result = await db.execute(select(Account).where(Account.id == transaction_in.account_id))
            new_account = result.scalars().first()
            if not new_account:
                raise HTTPException(status_code=404, detail="New account not found")
            if new_account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
                raise HTTPException(status_code=400, detail="Not enough permissions for the new account")

        update_data = transaction_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(transaction, key, value)

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{transaction_id}", response_model=TransactionRead)
async def delete_transaction(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transaction_id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a transaction.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
        transaction = result.scalars().first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Check ownership
        result = await db.execute(select(Account).where(Account.id == transaction.account_id))
        account = result.scalars().first()
        if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        await db.delete(transaction)
        await db.commit()
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bulk-delete")
async def bulk_delete_transactions(
    *,
    db: AsyncSession = Depends(deps.get_db),
    transaction_ids: List[UUID],
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete multiple transactions.
    """
    try:
        if current_user.permission == UserRole.READONLY:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Fetch all transactions to verify ownership
        query = select(Transaction).where(Transaction.id.in_(transaction_ids))
        result = await db.execute(query)
        transactions = result.scalars().all()

        if not transactions:
            return {"message": "No transactions found"}

        # Verify ownership for all
        account_ids = {t.account_id for t in transactions}
        query = select(Account).where(Account.id.in_(account_ids))
        result = await db.execute(query)
        accounts = result.scalars().all()
        
        # Check if user owns all accounts involved
        for account in accounts:
             if account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Not enough permissions")

        for transaction in transactions:
            await db.delete(transaction)
            
        await db.commit()
        return {"message": f"Deleted {len(transactions)} transactions"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
