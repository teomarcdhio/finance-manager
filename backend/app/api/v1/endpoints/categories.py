from typing import Any, List
from uuid import UUID
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api import deps
from app.models import Category, CategoryCreate, CategoryRead, CategoryUpdate, User
from app.models.user import UserRole

router = APIRouter()

@router.post("/import", response_model=dict)
async def import_categories(
    *,
    db: AsyncSession = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Import categories from CSV file.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        contents = await file.read()
        decoded_content = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        imported_count = 0
        errors = []
        
        for row in csv_reader:
            try:
                name = row.get('name')
                if not name:
                    continue
                    
                # Check if category exists
                result = await db.execute(select(Category).where(Category.name == name))
                existing = result.scalars().first()
                
                if not existing:
                    category_in = CategoryCreate(
                        name=name,
                        description=row.get('description')
                    )
                    category = Category.model_validate(category_in)
                    db.add(category)
                    imported_count += 1
            except Exception as e:
                errors.append(f"Error importing row {row}: {str(e)}")
                
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Successfully imported {imported_count} categories",
            "errors": errors if errors else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[CategoryRead])
async def read_categories(
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve categories.
    """
    try:
        result = await db.execute(select(Category).offset(skip).limit(limit))
        categories = result.scalars().all()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=CategoryRead)
async def create_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new category.
    """
    try:
        # Check for duplicate name
        result = await db.execute(select(Category).where(Category.name == category_in.name))
        existing_category = result.scalars().first()
        if existing_category:
            raise HTTPException(
                status_code=400,
                detail="A category with this name already exists.",
            )

        category = Category.model_validate(category_in)
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{category_id}", response_model=CategoryRead)
async def update_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_id: UUID,
    category_in: CategoryUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a category.
    """
    try:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalars().first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        update_data = category_in.model_dump(exclude_unset=True)
        
        if "name" in update_data:
             # Check for duplicate name
            result = await db.execute(select(Category).where(Category.name == update_data["name"], Category.id != category_id))
            existing_category = result.scalars().first()
            if existing_category:
                raise HTTPException(
                    status_code=400,
                    detail="A category with this name already exists.",
                )

        for field, value in update_data.items():
            setattr(category, field, value)

        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{category_id}", response_model=CategoryRead)
async def delete_category(
    *,
    db: AsyncSession = Depends(deps.get_db),
    category_id: UUID,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a category.
    """
    try:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalars().first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        await db.delete(category)
        await db.commit()
        return category
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
