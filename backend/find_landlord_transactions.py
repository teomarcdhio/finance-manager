import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.models import Account, Transaction

async def main():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Find Landlord account
        # Note: Account names might be case sensitive or not depending on how they were inserted, 
        # but the user said "Landlord". I'll try case-insensitive search just in case.
        from sqlalchemy import func
        query = select(Account).where(func.lower(Account.name) == "landlord")
        result = await session.execute(query)
        landlord = result.scalars().first()

        if not landlord:
            print("Landlord account not found.")
            return

        print(f"Found Landlord account: {landlord.id} ({landlord.name})")

        # Find transactions
        query = select(Transaction).where(Transaction.target_account_id == landlord.id)
        result = await session.execute(query)
        transactions = result.scalars().all()

        if not transactions:
            print("No transactions found for Landlord.")
        else:
            print(f"Found {len(transactions)} transactions:")
            for t in transactions:
                print(f"- Date: {t.date}, Amount: {t.amount}, Name: {t.name}, Type: {t.type}")

if __name__ == "__main__":
    asyncio.run(main())
