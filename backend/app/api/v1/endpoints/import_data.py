from typing import Any
import csv
import zipfile
import io
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.models import Transaction, Account, Category, User
from app.models.user import UserRole

router = APIRouter()

@router.post("/restore")
async def restore_backup(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    file: UploadFile = File(...)
) -> Any:
    """
    Restore data from a backup ZIP file (categories, accounts, transactions).
    Existing IDs will be updated; new IDs will be created.
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a ZIP file.")

    try:
        content = await file.read()
        zip_buffer = io.BytesIO(content)
        
        with zipfile.ZipFile(zip_buffer, "r") as zip_ref:
            file_names = zip_ref.namelist()
            
            # Helper to decode and parse CSV
            def parse_csv(filename):
                if filename not in file_names:
                    return []
                with zip_ref.open(filename) as f:
                    # Read and decode
                    csv_content = io.TextIOWrapper(f, encoding="utf-8")
                    reader = csv.DictReader(csv_content)
                    return list(reader)

            # 1. Import Categories
            categories_data = parse_csv("categories.csv")
            for row in categories_data:
                cat_id = UUID(row["id"])
                category = await db.get(Category, cat_id)
                if category:
                    category.name = row["name"]
                    category.description = row["description"] or None
                else:
                    category = Category(
                        id=cat_id,
                        name=row["name"],
                        description=row["description"] or None
                    )
                    db.add(category)
            
            await db.flush() # Ensure categories exist for FKs

            # 2. Import Accounts
            accounts_data = parse_csv("accounts.csv")
            for row in accounts_data:
                acc_id = UUID(row["id"])
                
                # Determine intended user_id from CSV
                # If "None", it's a destination account. Otherwise, assign to current user.
                row_user_id = row.get("user_id")
                target_user_id = current_user.id
                if row_user_id == "None" or not row_user_id:
                    target_user_id = None

                account = await db.get(Account, acc_id)
                
                # Verify ownership if exists (only for non-admin)
                # If account exists and belongs to another user, skip (unless Admin)
                # If account is a destination account (user_id=None), regular user shouldn't update it?
                # For now, let's strictly enforce ownership check against current user's ID
                if account and current_user.permission != UserRole.ADMIN:
                     if account.user_id != current_user.id and account.user_id is not None:
                         continue
                
                # Parse fields
                balance_val = Decimal(row["initial_balance"])
                # Handle balance_date being potentially missing in old backups (though we just fixed export)
                b_date = date.fromisoformat(row.get("balance_date", date.today().isoformat()))
                
                if account:
                    account.name = row["name"]
                    account.account_number = row["account_number"] or None
                    account.bank_name = row["bank_name"] or None
                    account.currency = row["currency"]
                    account.initial_balance = balance_val
                    account.balance_date = b_date
                    account.user_id = target_user_id
                else:
                    account = Account(
                        id=acc_id,
                        name=row["name"],
                        account_number=row["account_number"] or None,
                        bank_name=row["bank_name"] or None,
                        currency=row["currency"],
                        initial_balance=balance_val,
                        balance_date=b_date,
                        user_id=target_user_id
                    )
                    db.add(account)
            
            await db.flush()

            # 3. Import Transactions
            transactions_data = parse_csv("transactions.csv")
            for row in transactions_data:
                trans_id = UUID(row["id"])
                account_id = UUID(row["account_id"])
                
                # Check if account exists (it should, we just imported)
                # If we skipped an account due to permission, we should skip transaction
                account = await db.get(Account, account_id)
                if not account:
                    continue
                    
                target_account_id = UUID(row["target_account_id"]) if row.get("target_account_id") else None
                category_id = UUID(row["category_id"]) if row.get("category_id") else None
                
                amount_val = Decimal(row["amount"])
                date_val = datetime.fromisoformat(row["date"]) # Use fromisoformat for datetime

                transaction = await db.get(Transaction, trans_id)
                
                if transaction:
                    transaction.date = date_val
                    transaction.name = row["name"]
                    transaction.type = row["type"]
                    transaction.amount = amount_val
                    transaction.account_id = account_id
                    transaction.target_account_id = target_account_id
                    transaction.category_id = category_id
                else:
                    transaction = Transaction(
                        id=trans_id,
                        date=date_val,
                        name=row["name"],
                        type=row["type"],
                        amount=amount_val,
                        account_id=account_id,
                        target_account_id=target_account_id,
                        category_id=category_id
                    )
                    db.add(transaction)

            await db.commit()
            
            return {"message": "Restore successful", "counts": {
                "categories": len(categories_data),
                "accounts": len(accounts_data),
                "transactions": len(transactions_data)
            }}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")
