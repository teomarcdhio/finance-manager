import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to path so we can import app modules if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database URL from environment or default
user = os.getenv("POSTGRES_USER", "postgres")
password = os.getenv("POSTGRES_PASSWORD", "password123")
server = os.getenv("POSTGRES_SERVER", "db")
db = os.getenv("POSTGRES_DB", "nivetek_finance")
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"postgresql+asyncpg://{user}:{password}@{server}:5432/{db}"
)

async def migrate():
    print("Starting migration of transaction types (Case Normalization)...")
    
    # Create engine with isolation level AUTOCOMMIT for ALTER TYPE
    engine = create_async_engine(DATABASE_URL, isolation_level="AUTOCOMMIT")
    
    async with engine.connect() as conn:
        # Add lowercase values to enum if they don't exist
        for val in ['transfer', 'withdraw', 'interest']:
            print(f"Adding '{val}' to enum...")
            try:
                await conn.execute(text(f"ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS '{val}'"))
            except Exception as e:
                print(f"Error adding {val}: {e}")
                
    await engine.dispose()
    print("Engine disposed. Re-connecting for data update...")

    # Create engine for data updates
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        # Update Uppercase -> Lowercase
        # TRANSFER -> transfer
        print("Migrating TRANSFER -> transfer...")
        result = await conn.execute(text("UPDATE transaction SET type = 'transfer'::transactiontype WHERE type::text = 'TRANSFER'"))
        print(f"Updated {result.rowcount} 'TRANSFER' transactions to 'transfer'.")
        
        # WITHDRAW -> withdraw
        print("Migrating WITHDRAW -> withdraw...")
        result = await conn.execute(text("UPDATE transaction SET type = 'withdraw'::transactiontype WHERE type::text = 'WITHDRAW'"))
        print(f"Updated {result.rowcount} 'WITHDRAW' transactions to 'withdraw'.")

        # INTEREST -> interest
        print("Migrating INTEREST -> interest...")
        result = await conn.execute(text("UPDATE transaction SET type = 'interest'::transactiontype WHERE type::text = 'INTEREST'"))
        print(f"Updated {result.rowcount} 'INTEREST' transactions to 'interest'.")
        
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
