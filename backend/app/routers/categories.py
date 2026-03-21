from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.category import Category
from app.models.component import Component
from app.schemas.category import (
    CategoryCreate,
    CategoryDetailResponse,
    CategoryResponse,
    CategoryTreeResponse,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


def _build_tree(categories: list[Category]) -> list[dict]:
    """Build a tree structure from a flat list of categories."""
    by_id = {}
    roots = []
    for cat in categories:
        node = {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "parent_id": cat.parent_id,
            "pathstring": cat.pathstring,
            "default_footprint_id": cat.default_footprint_id,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "children": [],
        }
        by_id[cat.id] = node

    for cat in categories:
        node = by_id[cat.id]
        if cat.parent_id and cat.parent_id in by_id:
            by_id[cat.parent_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    parent_id: Optional[int] = Query(None, description="Filter by parent category"),
    db: Session = Depends(get_db),
):
    """List all categories, optionally filtered by parent_id."""
    query = db.query(Category)
    if parent_id is not None:
        if parent_id == 0:
            query = query.filter(Category.parent_id.is_(None))
        else:
            query = query.filter(Category.parent_id == parent_id)
    return query.order_by(Category.name).all()


@router.get("/tree", response_model=list[CategoryTreeResponse])
def get_category_tree(db: Session = Depends(get_db)):
    """Get full category tree."""
    categories = db.query(Category).order_by(Category.name).all()
    return _build_tree(categories)


@router.post("", response_model=CategoryResponse, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category."""
    if data.parent_id:
        parent = db.query(Category).filter(Category.id == data.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")

    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/{category_id}", response_model=CategoryDetailResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a category by ID with children and parts counts."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    parts_count = db.query(Component).filter(Component.category_id == category_id).count()

    return CategoryDetailResponse(
        id=category.id,
        name=category.name,
        description=category.description,
        parent_id=category.parent_id,
        pathstring=category.pathstring,
        default_footprint_id=category.default_footprint_id,
        created_at=category.created_at,
        updated_at=category.updated_at,
        children_count=children_count,
        parts_count=parts_count,
    )


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int, data: CategoryUpdate, db: Session = Depends(get_db)
):
    """Update a category."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = data.model_dump(exclude_unset=True)
    if "parent_id" in update_data and update_data["parent_id"] is not None:
        if update_data["parent_id"] == category_id:
            raise HTTPException(status_code=400, detail="Category cannot be its own parent")
        parent = db.query(Category).filter(Category.id == update_data["parent_id"]).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")

    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a category. Fails if it has parts or children."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with child categories",
        )

    parts_count = db.query(Component).filter(Component.category_id == category_id).count()
    if parts_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category with associated parts",
        )

    db.delete(category)
    db.commit()
