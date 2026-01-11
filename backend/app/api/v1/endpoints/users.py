from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api import deps
from app.core import security
from app.models import User, UserCreate, UserRead, UserUpdate
from app.models.user import UserRole

router = APIRouter()

@router.get("/", response_model=List[UserRead])
async def read_users(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    try:
        result = await db.execute(select(User).offset(skip).limit(limit))
        users = result.scalars().all()
        return users
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=UserRead)
async def create_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    try:
        result = await db.execute(select(User).where(User.email == user_in.email))
        user = result.scalars().first()
        if user:
            raise HTTPException(
                status_code=400,
                detail="The user with this username already exists in the system.",
            )
        
        user = User.model_validate(user_in, update={"hashed_password": security.get_password_hash(user_in.password)})
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me", response_model=UserRead)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    try:
        user_data = current_user.model_dump()
        is_default = security.verify_password("admin", current_user.hashed_password)
        return UserRead(**user_data, is_default_password=is_default)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: UUID,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Update a user.
    """
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="The user with this id does not exist in the system",
            )
        
        update_data = user_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            password = update_data["password"]
            hashed_password = security.get_password_hash(password)
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}", response_model=UserRead)
async def delete_user(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_id: UUID,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Delete a user.
    """
    try:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="The user with this id does not exist in the system",
            )
        
        await db.delete(user)
        await db.commit()
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/me", response_model=UserRead)
async def update_user_me(
    *,
    db: AsyncSession = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update own user.
    """
    try:
        user = current_user
        update_data = user_in.model_dump(exclude_unset=True)

        # Users cannot change their own permissions
        if "permission" in update_data:
            del update_data["permission"]

        if "password" in update_data:
            password = update_data["password"]
            hashed_password = security.get_password_hash(password)
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            
        for field, value in update_data.items():
            setattr(user, field, value)

        db.add(user)
        await db.commit()
        await db.refresh(user)

        user_data = user.model_dump()
        is_default = security.verify_password("admin", user.hashed_password)
        return UserRead(**user_data, is_default_password=is_default)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
