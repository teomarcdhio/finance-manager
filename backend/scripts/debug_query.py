import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import Transaction, TransactionType

# Database URL from environment or default
user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "password123")
server = os.getenv("POSTGRES_SERVER", "db")
db = os.getenv("POSTGRES_DB", "nivetek_finance")
DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{server}:5432/{db}"

async def test_query():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("Querying transactions...")
        try:
            query = select(Transaction).limit(5)
            result = await session.execute(query)
            transactions = result.scalars().all()
            for t in transactions:
                print(f"ID: {t.id}, Type: {t.type} (Type Class: {type(t.type)})")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_query())
