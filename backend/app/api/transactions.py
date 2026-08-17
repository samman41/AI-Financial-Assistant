from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional
from datetime import date

from app.db.database import get_db
from app.db import models, schemas
from app.auth.auth import get_current_user
from app.services.ai_service import categorize_transaction_ai
from app.ml.anomaly import detect_anomaly, scan_and_update_anomalies

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/", response_model=schemas.TransactionResponse)
def create_transaction(
    tx_in: schemas.TransactionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category = tx_in.category
    
    # 1. AI Categorization if uncategorized/empty
    if not category or category.strip() == "" or category.lower() in ["uncategorized", "none"]:
        category = categorize_transaction_ai(
            db, current_user.id, tx_in.name, tx_in.vendor, tx_in.description or ""
        )

    # 2. Check for anomaly
    is_anom, reason = detect_anomaly(
        db, current_user.id, tx_in.amount, category, tx_in.vendor, tx_in.type
    )

    db_tx = models.Transaction(
        user_id=current_user.id,
        name=tx_in.name,
        description=tx_in.description,
        category=category,
        amount=tx_in.amount,
        date=tx_in.date,
        payment_method=tx_in.payment_method,
        vendor=tx_in.vendor,
        type=tx_in.type,
        notes=tx_in.notes,
        is_anomaly=is_anom,
        anomaly_reason=reason if is_anom else None
    )
    
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

@router.get("/", response_model=List[schemas.TransactionResponse])
def read_transactions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    vendor: Optional[str] = None,
    tx_type: Optional[str] = None, # 'income' or 'expense'
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_anomaly: Optional[bool] = None,
    sort_by: str = "date", # 'date' or 'amount'
    sort_order: str = "desc", # 'asc' or 'desc'
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)

    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Transaction.name.like(search_filter),
                models.Transaction.description.like(search_filter),
                models.Transaction.vendor.like(search_filter),
                models.Transaction.notes.like(search_filter)
            )
        )
    if category:
        query = query.filter(models.Transaction.category == category)
    if vendor:
        query = query.filter(models.Transaction.vendor == vendor)
    if tx_type:
        query = query.filter(models.Transaction.type == tx_type)
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        query = query.filter(models.Transaction.date <= end_date)
    if is_anomaly is not None:
        query = query.filter(models.Transaction.is_anomaly == is_anomaly)

    # Apply sorting
    sort_attr = getattr(models.Transaction, sort_by, models.Transaction.date)
    if sort_order == "desc":
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())

    return query.offset(skip).limit(limit).all()

@router.get("/summary", response_model=dict)
def read_transactions_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns general aggregations (unique categories, list of vendors, counts)."""
    # Categories
    categories = db.query(models.Transaction.category).filter(
        models.Transaction.user_id == current_user.id
    ).distinct().all()
    categories_list = [c[0] for c in categories if c[0]]

    # Vendors
    vendors = db.query(models.Transaction.vendor).filter(
        models.Transaction.user_id == current_user.id
    ).distinct().all()
    vendors_list = [v[0] for v in vendors if v[0]]

    # Counts
    total_count = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).count()

    return {
        "categories": categories_list,
        "vendors": vendors_list,
        "total_count": total_count
    }

@router.get("/{tx_id}", response_model=schemas.TransactionResponse)
def read_transaction(
    tx_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    return tx

@router.put("/{tx_id}", response_model=schemas.TransactionResponse)
def update_transaction(
    tx_id: int,
    tx_update: schemas.TransactionUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Perform updates
    update_data = tx_update.dict(exclude_unset=True)
    
    # AI Categorization if category updated to empty
    if "category" in update_data and (not update_data["category"] or update_data["category"].strip() == "" or update_data["category"].lower() in ["uncategorized", "none"]):
        update_data["category"] = categorize_transaction_ai(
            db, current_user.id, 
            update_data.get("name", tx.name), 
            update_data.get("vendor", tx.vendor), 
            update_data.get("description", tx.description or "")
        )

    for field, value in update_data.items():
        setattr(tx, field, value)

    # Re-evaluate anomaly status
    is_anom, reason = detect_anomaly(
        db, current_user.id, tx.amount, tx.category, tx.vendor, tx.type
    )
    tx.is_anomaly = is_anom
    tx.anomaly_reason = reason if is_anom else None

    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
        
    db.delete(tx)
    db.commit()
    return {"detail": "Transaction deleted successfully"}

@router.post("/scan-anomalies")
def scan_anomalies(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Triggers an overall sweep of user accounts to run statistical calculations on outliers."""
    scan_and_update_anomalies(db, current_user.id)
    return {"detail": "Account scanning completed. Anomalies table updated."}
