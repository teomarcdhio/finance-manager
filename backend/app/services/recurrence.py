from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Transaction

async def process_recurrence(transaction: Transaction, db: AsyncSession):
    if not transaction.recurrency:
        return

    recurrency = transaction.recurrency
    frequency = recurrency.get("frequency")
    occurrences = recurrency.get("occurrences")
    end_date_str = recurrency.get("end_date")
    
    if not frequency:
        return

    end_date = None
    if end_date_str:
        end_date = date.fromisoformat(end_date_str)

    current_date = transaction.date
    count = 0
    
    # We already have the first one (the transaction itself)
    # So we start generating from the next one.
    
    while True:
        count += 1
        if occurrences and count >= occurrences:
            break
            
        if frequency == "daily":
            current_date += timedelta(days=1)
        elif frequency == "weekly":
            current_date += timedelta(weeks=1)
        elif frequency == "monthly":
            current_date += relativedelta(months=1)
        elif frequency == "yearly":
            current_date += relativedelta(years=1)
        else:
            break # Unknown frequency

        if end_date and current_date > end_date:
            break

        # Create new transaction
        new_transaction = Transaction(
            name=transaction.name,
            type=transaction.type,
            amount=transaction.amount,
            target_account=transaction.target_account,
            account_id=transaction.account_id,
            date=current_date,
            recurrency=None # Future instances don't recurse themselves to avoid infinite loops if we re-process
        )
        db.add(new_transaction)
    
    # We don't commit here, let the caller commit
