import datetime
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import extract
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from app.db import models

def get_historical_and_forecast_data(db: Session, user_id: int, forecast_months: int = 3) -> Dict:
    """
    Fetches historical transaction data, aggregates it by month, and uses Linear Regression
    to forecast the next `forecast_months` months.
    """
    # Fetch all transactions for user, sorted by date
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id
    ).order_by(models.Transaction.date.asc()).all()

    if not transactions:
        # Default empty response
        current_date = datetime.date.today()
        history = []
        for i in range(5, 0, -1):
            d = current_date - datetime.timedelta(days=i*30)
            history.append({
                "date": d.strftime("%Y-%m"),
                "revenue": 0.0,
                "expenses": 0.0,
                "net_profit": 0.0,
                "cash_balance": 10000.0 # Standard baseline starting cash
            })
        
        forecast = []
        for i in range(1, forecast_months + 1):
            d = current_date + datetime.timedelta(days=i*30)
            forecast.append({
                "date": d.strftime("%Y-%m"),
                "revenue": 0.0,
                "expenses": 0.0,
                "net_profit": 0.0,
                "cash_balance": 10000.0
            })
            
        return {
            "historical": history,
            "forecast": forecast,
            "metrics": {
                "next_month_revenue": 0.0,
                "next_month_expenses": 0.0,
                "expected_profit": 0.0,
                "projected_cash_balance": 10000.0
            }
        }

    # Convert to Pandas DataFrame
    data = []
    for tx in transactions:
        data.append({
            "date": pd.to_datetime(tx.date),
            "amount": tx.amount,
            "type": tx.type # 'income' or 'expense'
        })
    df = pd.DataFrame(data)
    
    # Create Year-Month column
    df['year_month'] = df['date'].dt.to_period('M')
    
    # Separate into revenue and expenses
    revenue_df = df[df['type'] == 'income'].groupby('year_month')['amount'].sum().reset_index()
    revenue_df.rename(columns={'amount': 'revenue'}, inplace=True)
    
    expense_df = df[df['type'] == 'expense'].groupby('year_month')['amount'].sum().reset_index()
    expense_df.rename(columns={'amount': 'expenses'}, inplace=True)
    
    # Merge on year_month
    all_months = df.groupby('year_month').size().reset_index()[['year_month']]
    merged = pd.merge(all_months, revenue_df, on='year_month', how='left').fillna(0)
    merged = pd.merge(merged, expense_df, on='year_month', how='left').fillna(0)
    
    # Calculate net profit
    merged['net_profit'] = merged['revenue'] - merged['expenses']
    
    # Cash balance cumulative sum (assume a starting cash balance of $10,000 if not configured)
    initial_cash = 10000.0
    merged['cash_balance'] = initial_cash + merged['net_profit'].cumsum()
    
    # Convert period back to string
    merged['date_str'] = merged['year_month'].dt.strftime('%Y-%m')
    
    historical_list = []
    for _, row in merged.iterrows():
        historical_list.append({
            "date": row['date_str'],
            "revenue": float(row['revenue']),
            "expenses": float(row['expenses']),
            "net_profit": float(row['net_profit']),
            "cash_balance": float(row['cash_balance'])
        })
    
    # Forecast next months
    last_period = merged['year_month'].max()
    last_cash = merged['cash_balance'].iloc[-1]
    
    forecast_list = []
    n_history = len(merged)
    
    # Features (month indices 0 to N-1)
    X = np.array(range(n_history)).reshape(-1, 1)
    
    if n_history < 2:
        # Not enough data for trend analysis, forecast based on last values or averages
        avg_rev = float(merged['revenue'].mean())
        avg_exp = float(merged['expenses'].mean())
        running_cash = last_cash
        
        for i in range(1, forecast_months + 1):
            future_period = last_period + i
            net_prof = avg_rev - avg_exp
            running_cash += net_prof
            
            forecast_list.append({
                "date": future_period.strftime('%Y-%m'),
                "revenue": avg_rev,
                "expenses": avg_exp,
                "net_profit": net_prof,
                "cash_balance": running_cash
            })
    else:
        # Fit Linear Regressions for Revenue and Expenses
        model_rev = LinearRegression()
        model_rev.fit(X, merged['revenue'])
        
        model_exp = LinearRegression()
        model_exp.fit(X, merged['expenses'])
        
        running_cash = last_cash
        for i in range(1, forecast_months + 1):
            future_period = last_period + i
            future_idx = n_history + i - 1
            
            pred_rev = max(0.0, float(model_rev.predict([[future_idx]])[0]))
            pred_exp = max(0.0, float(model_exp.predict([[future_idx]])[0]))
            
            # Dampen extreme predictions
            if pred_rev > merged['revenue'].max() * 3:
                pred_rev = float(merged['revenue'].mean() * 1.5)
            if pred_exp > merged['expenses'].max() * 3:
                pred_exp = float(merged['expenses'].mean() * 1.5)
                
            net_prof = pred_rev - pred_exp
            running_cash += net_prof
            
            forecast_list.append({
                "date": future_period.strftime('%Y-%m'),
                "revenue": round(pred_rev, 2),
                "expenses": round(pred_exp, 2),
                "net_profit": round(net_prof, 2),
                "cash_balance": round(running_cash, 2)
            })

    # Metrics for the immediate next month
    next_month = forecast_list[0]
    metrics = {
        "next_month_revenue": next_month["revenue"],
        "next_month_expenses": next_month["expenses"],
        "expected_profit": next_month["net_profit"],
        "projected_cash_balance": next_month["cash_balance"]
    }
    
    return {
        "historical": historical_list,
        "forecast": forecast_list,
        "metrics": metrics
    }
