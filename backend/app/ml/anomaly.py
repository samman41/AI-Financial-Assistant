from sqlalchemy.orm import Session
from sqlalchemy import func
import numpy as np
from app.db import models

def detect_anomaly(db: Session, user_id: int, amount: float, category: str, vendor: str, tx_type: str = "expense") -> tuple[bool, str]:
    """
    Checks if a single transaction amount is anomalous compared to the user's history
    for that category or vendor.
    
    Returns: (is_anomaly, reason)
    """
    if tx_type != "expense":
        return False, ""

    # Don't flag tiny transactions
    if amount < 50.0:
        return False, ""

    # 1. Fetch expenses for this category to calculate stats in Python (database-agnostic)
    cat_txs = db.query(models.Transaction.amount).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.category == category,
        models.Transaction.type == "expense"
    ).all()
    
    cat_amounts = [t[0] for t in cat_txs]
    count = len(cat_amounts)

    if count >= 3:
        avg_amt = float(np.mean(cat_amounts))
        std_amt = float(np.std(cat_amounts))
        
        # Category statistical check: check if amount is significantly higher than usual (Z-score > 2.5)
        z_score = (amount - avg_amt) / std_amt if std_amt > 0.0 else 0.0
        if z_score > 2.5:
            return True, f"Unusually high spending for {category} (amount is {round(z_score, 1)} standard deviations above average)."
        
        # Absolute multiplier check (e.g., spending is 4x the typical average in this category)
        if avg_amt > 0.0 and amount > avg_amt * 4.0:
            return True, f"Expense is {round(amount / avg_amt, 1)}x higher than the typical average of {category} (${round(avg_amt, 2)})."

    # 2. Vendor check
    vendor_txs = db.query(models.Transaction.amount).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.vendor == vendor,
        models.Transaction.type == "expense"
    ).all()
    
    v_amounts = [t[0] for t in vendor_txs]
    v_count = len(v_amounts)

    if v_count >= 2:
        v_avg = float(np.mean(v_amounts))
        if v_avg > 0.0 and amount > v_avg * 3.0:
            return True, f"Expense is {round(amount / v_avg, 1)}x higher than the average paid to {vendor} (${round(v_avg, 2)})."

    # 3. Absolute threshold check for very large overall transactions
    overall_avg_row = db.query(func.avg(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense"
    ).scalar()

    overall_avg = float(overall_avg_row) if overall_avg_row is not None else 0.0

    if overall_avg > 0.0 and amount > overall_avg * 8.0 and amount > 1000.0:
        return True, f"Outsized transaction representing over 8x your overall average expense (${round(overall_avg, 2)})."

    return False, ""

def scan_and_update_anomalies(db: Session, user_id: int):
    """
    Scans all user transactions and updates the is_anomaly and anomaly_reason fields.
    """
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id
    ).all()

    for tx in transactions:
        is_anom, reason = detect_anomaly(db, user_id, tx.amount, tx.category, tx.vendor, tx.type)
        tx.is_anomaly = is_anom
        tx.anomaly_reason = reason if is_anom else None
    
    db.commit()
