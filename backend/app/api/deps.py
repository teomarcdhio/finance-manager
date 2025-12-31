from typing import Generator, AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core import security
from app.core.config import settings
from app.db.session import get_session
from app.models import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = payload.get("sub")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # In a real app, you would fetch the user from DB.
    # Since we are using async, we need to execute a query.
    from sqlmodel import select
    result = await db.execute(select(User).where(User.id == token_data))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    # Add active check if needed
    return current_user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.permission != "admin":
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user
