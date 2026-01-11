from typing import Any, List, Optional
from uuid import UUID
from decimal import Decimal
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select
from datetime import date as date_type
from decimal import Decimal

from app.api import deps
from app.models import Account, AccountCreate, AccountRead, AccountUpdate, User, Transaction, TransactionType, TransactionRead, Category
from app.models.user import UserRole

router = APIRouter()

@router.post("/destination/import", response_model=dict)
async def import_destination_accounts(
    *,
    db: AsyncSession = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Import destination accounts from CSV file.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        contents = await file.read()
        decoded_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        imported_count = 0
        errors = []
        
        for row in csv_reader:
            try:
                name = row.get('name')
                if not name:
                    continue
                    
                # Check if account exists (case-insensitive)
                query = select(Account).where(
                    func.lower(Account.name) == func.lower(name),
                    Account.user_id == None
                )
                result = await db.execute(query)
                existing = result.scalars().first()
                
                if not existing:
                    # Handle category if provided
                    category_id = None
                    category_name = row.get('category')
                    if category_name:
                        cat_result = await db.execute(select(Category).where(func.lower(Category.name) == func.lower(category_name)))
                        category = cat_result.scalars().first()
                        if category:
                            category_id = category.id

                    account_in = AccountCreate(
                        name=name,
                        bank_name=row.get('bank_name', 'Unknown'),
                        account_number=row.get('account_number'),
                        category_id=category_id,
                        initial_balance=0,
                        currency="USD"
                    )
                    # Ensure user_id is None for destination accounts
                    account = Account.model_validate(account_in, update={"user_id": None})
                    db.add(account)
                    imported_count += 1
            except Exception as e:
                errors.append(f"Error importing row {row}: {str(e)}")
                
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Successfully imported {imported_count} destination accounts",
            "errors": errors if errors else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/destination", response_model=List[AccountRead])
async def read_destination_accounts(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve destination accounts (accounts without user_id).
    """
    try:
        query = select(Account).where(Account.user_id == None).offset(skip).limit(limit)
        result = await db.execute(query)
        accounts = result.scalars().all()
        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/destination", response_model=AccountRead)
async def create_destination_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_in: AccountCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new destination account.
    """
    try:
        # Check for duplicate name (case-insensitive)
        query = select(Account).where(
            func.lower(Account.name) == func.lower(account_in.name), 
            Account.user_id == None
        )
        result = await db.execute(query)
        existing_account = result.scalars().first()
        if existing_account:
            raise HTTPException(
                status_code=400,
                detail="A destination account with this name already exists.",
            )

        # Ensure user_id is None
        account = Account.model_validate(account_in, update={"user_id": None})
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            query = select(Account).where(Account.user_id != None).offset(skip).limit(limit)
        else:
            query = select(Account).where(Account.user_id == current_user.id).offset(skip).limit(limit)
            
        result = await db.execute(query)
        accounts = result.scalars().all()
        
        account_reads = []
        for account in accounts:
            # Calculate balance for each account
            query_sum = select(func.sum(Transaction.amount)).where(Transaction.account_id == account.id)
            result_sum = await db.execute(query_sum)
            total_transactions = result_sum.scalar() or Decimal(0)
            
            account_read = AccountRead.model_validate(account)
            account_read.current_balance = account.initial_balance + total_transactions
            account_reads.append(account_read)
            
        return account_reads
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
    end_date: Optional[date_type] = Query(None),
) -> Any:
    """
    Get account by ID.
    """
    try:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        if account.user_id is not None and account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=400, detail="Not enough permissions")
            
        # Calculate balance
        query = select(func.sum(Transaction.amount)).where(Transaction.account_id == account_id)
        if end_date:
            query = query.where(Transaction.date <= end_date)
            
        result_sum = await db.execute(query)
        total_transactions = result_sum.scalar() or Decimal(0)
        
        account_read = AccountRead.model_validate(account)
        account_read.current_balance = account.initial_balance + total_transactions
        
        return account_read
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
        if account.user_id is not None and account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        update_data = account_in.model_dump(exclude_unset=True)
        
        # Check for duplicate name if updating a destination account
        if account.user_id is None and "name" in update_data:
            query = select(Account).where(
                func.lower(Account.name) == func.lower(update_data["name"]), 
                Account.user_id == None,
                Account.id != account_id
            )
            result = await db.execute(query)
            existing_account = result.scalars().first()
            if existing_account:
                raise HTTPException(
                    status_code=400,
                    detail="A destination account with this name already exists.",
                )

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
        if account.user_id is not None and account.user_id != current_user.id and current_user.permission != UserRole.ADMIN:
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
                if txn.type in [TransactionType.INCOME]:
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
                if txn.type in [TransactionType.INCOME]:
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
            if txn.type in [TransactionType.INCOME]:
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
    target_account_id: UUID,
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
            Transaction.target_account_id == target_account_id
        )

        if start_date:
            query = query.where(Transaction.date >= start_date)
        if end_date:
            query = query.where(Transaction.date <= end_date)

        query = query.order_by(Transaction.date.desc())

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
    target_account_id: UUID,
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
            Transaction.target_account_id == target_account_id
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

@router.delete("/destination/{account_id}", response_model=AccountRead)
async def delete_destination_account(
    *,
    db: AsyncSession = Depends(deps.get_db),
    account_id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a destination account.
    """
    try:
        result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == None))
        account = result.scalars().first()
        if not account:
            raise HTTPException(status_code=404, detail="Destination account not found")
            
        # Check for transactions using this account as target
        txn_result = await db.execute(select(Transaction).where(Transaction.target_account_id == account_id).limit(1))
        if txn_result.scalars().first():
             raise HTTPException(
                status_code=400,
                detail="Cannot delete destination account because it is used in transactions.",
            )

        await db.delete(account)
        await db.commit()
        return account
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
