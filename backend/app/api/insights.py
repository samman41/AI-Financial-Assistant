from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
import datetime
from typing import List, Dict, Any

from app.db.database import get_db
from app.db import models, schemas
from app.auth.auth import get_current_user
from app.services.ai_service import generate_ai_insights
from app.ml.forecaster import get_historical_and_forecast_data

router = APIRouter(prefix="/insights", tags=["AI Insights & Analytics"])

@router.get("/", response_model=schemas.AIInsightsResponse)
def get_insights(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates AI insights and advice regarding recent cash and category trends."""
    insights_list = generate_ai_insights(db, current_user.id)
    return {"insights": insights_list}

@router.get("/forecast", response_model=schemas.ForecastResponse)
def get_forecast(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates cash balance and transaction forecasts for the next 3 months."""
    return get_historical_and_forecast_data(db, current_user.id)

@router.get("/analytics", response_model=dict)
def get_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregates detailed business stats for expense analysis views."""
    now = datetime.date.today()
    this_month_start = datetime.date(now.year, now.month, 1)
    this_year_start = datetime.date(now.year, 1, 1)

    # 1. Largest Expense Categories (all time or current year)
    cat_expenses = db.query(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense"
    ).group_by(models.Transaction.category).order_by(func.sum(models.Transaction.amount).desc()).all()
    categories_breakdown = [{"category": c, "amount": float(t)} for c, t in cat_expenses]

    # 2. Highest Spending Vendors
    vendor_expenses = db.query(
        models.Transaction.vendor,
        func.sum(models.Transaction.amount).label("total"),
        func.count(models.Transaction.id).label("count")
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense"
    ).group_by(models.Transaction.vendor).order_by(func.sum(models.Transaction.amount).desc()).limit(10).all()
    vendors_breakdown = [{"vendor": v, "amount": float(t), "transaction_count": c} for v, t, c in vendor_expenses]

    # 3. Top Income Sources
    income_sources = db.query(
        models.Transaction.vendor,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "income"
    ).group_by(models.Transaction.vendor).order_by(func.sum(models.Transaction.amount).desc()).limit(5).all()
    income_breakdown = [{"source": s, "amount": float(t)} for s, t in income_sources]

    # 4. Monthly Spending breakdown for Current Year
    monthly_expenses = db.query(
        extract("month", models.Transaction.date).label("month"),
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense",
        models.Transaction.date >= this_year_start
    ).group_by(extract("month", models.Transaction.date)).order_by("month").all()
    
    monthly_spending = [0.0] * 12
    for m, t in monthly_expenses:
        idx = int(m) - 1
        if 0 <= idx < 12:
            monthly_spending[idx] = float(t)

    # 5. Yearly Spending totals
    yearly_expenses = db.query(
        extract("year", models.Transaction.date).label("year"),
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense"
    ).group_by(extract("year", models.Transaction.date)).order_by("year").all()
    yearly_spending = {str(int(y)): float(t) for y, t in yearly_expenses}

    # 6. Average Daily Expense this month
    this_month_days = (now - this_month_start).days + 1
    if this_month_days <= 0:
        this_month_days = 1
        
    this_month_total_exp = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense",
        models.Transaction.date >= this_month_start
    ).scalar() or 0.0
    
    avg_daily_expense = this_month_total_exp / this_month_days

    # 7. Total KPIs
    total_revenue = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "income"
    ).scalar() or 0.0
    
    total_expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.type == "expense"
    ).scalar() or 0.0

    return {
        "largest_categories": categories_breakdown,
        "highest_vendors": vendors_breakdown,
        "top_income_sources": income_breakdown,
        "monthly_spending_current_year": monthly_spending,
        "yearly_spending": yearly_spending,
        "average_daily_expense_current_month": round(avg_daily_expense, 2),
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_profit": total_revenue - total_expenses
    }
