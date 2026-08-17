from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
import pandas as pd
import io
import datetime
from typing import List, Optional

from app.db.database import get_db
from app.db import models, schemas
from app.auth.auth import get_current_user
from app.services.ai_service import categorize_transaction_ai
from app.ml.anomaly import detect_anomaly

router = APIRouter(prefix="/import", tags=["CSV & Excel Import"])

def fuzzy_match_column(df_cols: List[str], targets: List[str]) -> Optional[str]:
    """Helper to find column index matching target keywords fuzzy."""
    for col in df_cols:
        col_clean = str(col).lower().strip().replace("_", "").replace(" ", "")
        for target in targets:
            target_clean = target.lower().strip().replace("_", "").replace(" ", "")
            if target_clean in col_clean or col_clean in target_clean:
                return col
    return None

@router.post("/upload", response_model=dict)
def upload_file(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = file.file.read()
    file.file.seek(0)
    file_size = len(contents)

    filename = file.filename
    is_excel = filename.endswith(('.xlsx', '.xls'))
    is_csv = filename.endswith('.csv')

    if not is_excel and not is_csv:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx) file."
        )

    try:
        if is_csv:
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read the file: {str(e)}"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file contains no data."
        )

    cols = [str(c) for c in df.columns]

    # Map headers automatically
    name_col = fuzzy_match_column(cols, ["name", "title", "transaction", "payee"])
    amount_col = fuzzy_match_column(cols, ["amount", "value", "price", "cost", "total"])
    date_col = fuzzy_match_column(cols, ["date", "timestamp", "time"])
    type_col = fuzzy_match_column(cols, ["type", "transactiontype", "incomeexpense"])
    category_col = fuzzy_match_column(cols, ["category", "cat", "genre"])
    payment_col = fuzzy_match_column(cols, ["payment", "method", "card", "account", "paymentmethod"])
    vendor_col = fuzzy_match_column(cols, ["vendor", "merchant", "store", "shop"])
    desc_col = fuzzy_match_column(cols, ["description", "desc", "details"])
    notes_col = fuzzy_match_column(cols, ["notes", "memo"])

    # Create temporary record for the upload log
    upload_log = models.ImportedFile(
        user_id=current_user.id,
        filename=filename,
        file_size=file_size,
        status="pending",
        row_count=len(df)
    )
    db.add(upload_log)
    db.commit()
    db.refresh(upload_log)

    previews = []
    
    # Process up to 500 records for validation preview
    for idx, row in df.iterrows():
        errors = []
        is_valid = True

        # Extract values
        raw_name = str(row[name_col]) if name_col and pd.notna(row[name_col]) else ""
        raw_amount = row[amount_col] if amount_col and pd.notna(row[amount_col]) else None
        raw_date = row[date_col] if date_col and pd.notna(row[date_col]) else None
        raw_type = str(row[type_col]).lower() if type_col and pd.notna(row[type_col]) else "expense"
        raw_category = str(row[category_col]) if category_col and pd.notna(row[category_col]) else ""
        raw_payment = str(row[payment_col]) if payment_col and pd.notna(row[payment_col]) else "Credit Card"
        raw_vendor = str(row[vendor_col]) if vendor_col and pd.notna(row[vendor_col]) else ""
        raw_desc = str(row[desc_col]) if desc_col and pd.notna(row[desc_col]) else ""
        raw_notes = str(row[notes_col]) if notes_col and pd.notna(row[notes_col]) else ""

        # Validate Name
        name = raw_name.strip()
        if not name:
            errors.append("Transaction name is missing.")
            is_valid = False

        # Validate Amount
        amount = 0.0
        try:
            if raw_amount is None:
                errors.append("Transaction amount is missing.")
                is_valid = False
            else:
                # Remove currency symbols or commas
                cleaned_amount = str(raw_amount).replace('$', '').replace(',', '').strip()
                amount = float(cleaned_amount)
                # If negative, invert to positive and change type to expense
                if amount < 0:
                    amount = abs(amount)
                    raw_type = "expense"
        except ValueError:
            errors.append(f"Invalid amount value: {raw_amount}")
            is_valid = False

        # Validate Date
        parsed_date = None
        try:
            if raw_date is None:
                errors.append("Transaction date is missing.")
                is_valid = False
            else:
                parsed_date = pd.to_datetime(raw_date).date()
        except Exception:
            errors.append(f"Invalid date format: {raw_date}")
            is_valid = False

        # Validate Type
        tx_type = "expense"
        if raw_type in ["income", "credit", "inbound", "revenue", "deposit"]:
            tx_type = "income"

        # Vendor fallback to name
        vendor = raw_vendor.strip()
        if not vendor:
            vendor = name  # If vendor is missing, copy name

        # Category prediction if empty
        category = raw_category.strip()
        if is_valid and (not category or category.lower() in ["uncategorized", "none", ""]):
            category = categorize_transaction_ai(db, current_user.id, name, vendor, raw_desc)
        elif not category:
            category = "Uncategorized"

        previews.append({
            "name": name,
            "description": raw_desc or None,
            "category": category,
            "amount": amount,
            "date": parsed_date.strftime('%Y-%m-%d') if parsed_date else None,
            "payment_method": raw_payment,
            "vendor": vendor,
            "type": tx_type,
            "notes": raw_notes or None,
            "is_valid": is_valid,
            "errors": errors
        })

    return {
        "upload_id": upload_log.id,
        "filename": filename,
        "row_count": len(previews),
        "headers": {
            "name": name_col,
            "amount": amount_col,
            "date": date_col,
            "category": category_col,
            "vendor": vendor_col,
            "payment_method": payment_col
        },
        "preview": previews
    }

@router.post("/commit", response_model=dict)
def commit_import(
    req: schemas.ImportCommitRequest,
    upload_id: int = Query(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    upload_log = db.query(models.ImportedFile).filter(
        models.ImportedFile.id == upload_id,
        models.ImportedFile.user_id == current_user.id
    ).first()

    if not upload_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload log not found."
        )

    if not req.transactions:
        upload_log.status = "failed"
        db.commit()
        return {"detail": "No transactions were committed."}

    created_txs = []
    
    # Track statistics for speed and calculations
    for tx_in in req.transactions:
        # Check for anomaly
        is_anom, reason = detect_anomaly(
            db, current_user.id, tx_in.amount, tx_in.category, tx_in.vendor, tx_in.type
        )
        
        db_tx = models.Transaction(
            user_id=current_user.id,
            name=tx_in.name,
            description=tx_in.description,
            category=tx_in.category,
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
        created_txs.append(db_tx)

    # Update log stats
    upload_log.row_count = len(created_txs)
    upload_log.status = "success"
    db.commit()

    return {
        "detail": "Data imported successfully.",
        "committed_count": len(created_txs)
    }
