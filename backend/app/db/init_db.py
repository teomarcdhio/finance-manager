from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select
from sqlalchemy.orm import sessionmaker
from app.db.session import engine
from app.models import User
from app.models.user import UserRole
from app.core.security import get_password_hash

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        user = result.scalars().first()
        
        if not user:
            user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin"),
                permission=UserRole.ADMIN,
                label="System Admin"
            )
            session.add(user)
            await session.commit()
