import asyncio
from sqlalchemy import text
from app.db.session import engine

async def migrate():
    print("Starting migration of transaction types...")
    
    # Step 1: Add new enum values (outside of transaction)
    # Use a disposable engine for this part to ensure no caching issues
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        try:
            print("Adding 'expense' to enum...")
            await conn.execute(text("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'expense'"))
        except Exception as e:
            print(f"Note: {e}")

        try:
            print("Adding 'income' to enum...")
            await conn.execute(text("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'income'"))
        except Exception as e:
            print(f"Note: {e}")
            
    # Dispose of engine to clear any cached type info in asyncpg pool
    await engine.dispose()
    print("Engine disposed. Re-connecting for data update...")

    # Step 2: Migrate data
    # We cast to text in WHERE clause to be safe, and rely on string literal for SET.
    # If asyncpg complains, we might need 'expense'::transactiontype
    async with engine.begin() as conn:
        # Payment -> Expense
        print("Migrating Payment -> Expense...")
        result_payment = await conn.execute(text("UPDATE transaction SET type = 'expense'::transactiontype WHERE type::text ILIKE 'payment'"))
        print(f"Updated {result_payment.rowcount} 'payment' transactions to 'expense'.")
        
        # Deposit -> Income
        print("Migrating Deposit -> Income...")
        result_deposit = await conn.execute(text("UPDATE transaction SET type = 'income'::transactiontype WHERE type::text ILIKE 'deposit'"))
        print(f"Updated {result_deposit.rowcount} 'deposit' transactions to 'income'.")
        
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
