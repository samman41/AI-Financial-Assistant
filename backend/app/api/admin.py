from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import os
import sys

from app.db.database import get_db
from app.db import models, schemas
from app.auth.auth import get_current_admin_user
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Panel"])

@router.get("/users", response_model=List[schemas.UserAdminResponse])
def get_all_users(
    admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin only: Lists all registered accounts and counts their transactions ledger size."""
    users = db.query(models.User).all()
    
    response = []
    for user in users:
        tx_count = db.query(models.Transaction).filter(models.Transaction.user_id == user.id).count()
        # Find last transaction date as last active proxy
        last_tx = db.query(models.Transaction.created_at).filter(
            models.Transaction.user_id == user.id
        ).order_by(models.Transaction.created_at.desc()).first()
        
        last_active = last_tx[0] if last_tx else user.created_at
        
        response.append(
            schemas.UserAdminResponse(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                company_name=user.company_name,
                currency=user.currency,
                tax_rate=user.tax_rate,
                theme=user.theme,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                transaction_count=tx_count,
                last_active=last_active
            )
        )
    return response

@router.delete("/users/{user_id}")
def delete_user_account(
    user_id: int,
    admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin only: Deletes a user profile and cascades delete to all transactions/files."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Self-deletion is not permitted."
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    db.delete(user)
    db.commit()
    return {"detail": f"Account {user.email} and all associated records deleted successfully."}

@router.get("/health", response_model=schemas.SystemHealth)
def get_system_health(
    admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin only: Diagnoses DB connection, count sizes, and connection configuration."""
    db_connected = True
    try:
        # Run dummy query
        db.execute(func.now() if not settings.DATABASE_URL.startswith("sqlite") else func.time())
    except Exception:
        db_connected = False

    total_users = db.query(models.User).count()
    total_tx = db.query(models.Transaction).count()

    db_type = "MySQL" if settings.DATABASE_URL.startswith("mysql") else "SQLite"

    return schemas.SystemHealth(
        database_connected=db_connected,
        total_users=total_users,
        total_transactions=total_tx,
        database_type=db_type
    )

@router.get("/ai-usage", response_model=List[schemas.AIUsageStats])
def get_ai_usage_stats(
    admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin only: Gathers aggregate data on token usage broken down by AI feature."""
    usages = db.query(
        models.AIUsage.feature,
        func.count(models.AIUsage.id).label("count"),
        func.sum(models.AIUsage.prompt_tokens + models.AIUsage.completion_tokens).label("total_tokens")
    ).group_by(models.AIUsage.feature).all()

    response = []
    for feature, count, total in usages:
        response.append(
            schemas.AIUsageStats(
                feature=feature,
                count=count,
                estimated_tokens=int(total) if total is not None else 0
            )
        )
    return response

@router.get("/files", response_model=List[dict])
def get_uploaded_files_log(
    admin: models.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin only: Lists all CSV/Excel files processed in the platform."""
    files = db.query(
        models.ImportedFile, models.User.email
    ).join(
        models.User, models.ImportedFile.user_id == models.User.id
    ).order_by(models.ImportedFile.created_at.desc()).all()

    response = []
    for f, email in files:
        response.append({
            "id": f.id,
            "filename": f.filename,
            "file_size": f.file_size,
            "row_count": f.row_count,
            "status": f.status,
            "user_email": email,
            "created_at": f.created_at
        })
    return response
