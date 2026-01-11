from typing import Any
import io
import csv
import zipfile
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api import deps
from app.models import Transaction, Account, Category, User
from app.models.user import UserRole

router = APIRouter()

@router.get("/backup", response_class=StreamingResponse)
async def export_backup(
    *,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export all data (Accounts, Transactions, Categories) as a ZIP of CSV files.
    """
    
    # 1. Fetch Data
    
    # Categories (All)
    categories_result = await db.execute(select(Category))
    categories = categories_result.scalars().all()
    
    # Accounts (User filtered)
    if current_user.permission == UserRole.ADMIN:
        accounts_query = select(Account)
    else:
        accounts_query = select(Account).where(Account.user_id == current_user.id)
    accounts_result = await db.execute(accounts_query)
    accounts = accounts_result.scalars().all()
    
    # Transactions (User filtered via Account)
    if current_user.permission == UserRole.ADMIN:
        transactions_query = select(Transaction)
    else:
        transactions_query = select(Transaction).join(Account).where(Account.user_id == current_user.id)
    transactions_result = await db.execute(transactions_query)
    transactions = transactions_result.scalars().all()
    
    # 2. Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        
        # Helper to write list of items to CSV in zip
        def write_csv_to_zip(filename: str, items: list, headers: list, row_mapper: callable):
            csv_buffer = io.StringIO()
            writer = csv.writer(csv_buffer)
            writer.writerow(headers)
            for item in items:
                writer.writerow(row_mapper(item))
            
            zip_file.writestr(filename, csv_buffer.getvalue())

        # Categories
        write_csv_to_zip(
            "categories.csv",
            categories,
            ["id", "name", "description"],
            lambda c: [str(c.id), c.name, c.description]
        )
        
        # Accounts
        write_csv_to_zip(
            "accounts.csv",
            accounts,
            ["id", "name", "account_number", "bank_name", "currency", "initial_balance", "balance_date", "user_id"],
            lambda a: [str(a.id), a.name, a.account_number, a.bank_name, a.currency, str(a.initial_balance), a.balance_date.isoformat(), str(a.user_id)]
        )
        
        # Transactions
        write_csv_to_zip(
            "transactions.csv",
            transactions,
            ["id", "date", "name", "type", "amount", "account_id", "target_account_id", "category_id"],
            lambda t: [
                str(t.id), 
                t.date.isoformat(), 
                t.name, 
                t.type, 
                str(t.amount), 
                str(t.account_id), 
                str(t.target_account_id) if t.target_account_id else "", 
                str(t.category_id) if t.category_id else ""
            ]
        )

    # 3. Return ZIP response
    zip_buffer.seek(0)
    
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
