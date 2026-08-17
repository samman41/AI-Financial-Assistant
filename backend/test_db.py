import sys
import os
import datetime

# Add directory to sys path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.database import Base, SessionLocal, engine
from app.db import models
from app.ml.classifier import classifier_model
from app.ml.anomaly import detect_anomaly
from app.ml.forecaster import get_historical_and_forecast_data

def run_tests():
    print("---------------------------------------------")
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Test User creation
        print("\nTesting User Creation...")
        test_email = "test_user_unique@example.com"
        # Delete existing test user if any
        existing_user = db.query(models.User).filter(models.User.email == test_email).first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            
        test_user = models.User(
            email=test_email,
            hashed_password="hashedpassword_bcrypt_123",
            full_name="John Test Doe",
            company_name="Test Enterprise Inc.",
            currency="USD",
            tax_rate=15.0
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print(f"[OK] User created successfully! ID: {test_user.id}")

        # 2. Test ML Classifier (Local heuristics check)
        print("\nTesting ML Categorizer...")
        names = ["Amazon web services hosting fee", "Uber ride downtown", "Coffee at Starbucks", "Microsoft Office 365 renew"]
        for name in names:
            cat = classifier_model.predict(name)
            print(f"  '{name}' -> Categorized as: '{cat}'")
        print("[OK] Categorizer completed test runs!")

        # 3. Test Transaction Creation with Anomaly Detection
        print("\nTesting Transactions & Outlier Detection...")
        # Add baseline transactions
        baseline_txs = [
            models.Transaction(user_id=test_user.id, name="Office Rent", category="Rent & Utilities", amount=1500.0, date=datetime.date(2026, 6, 1), payment_method="ACH", vendor="Landlord LLC", type="expense"),
            models.Transaction(user_id=test_user.id, name="Internet", category="Rent & Utilities", amount=120.0, date=datetime.date(2026, 6, 5), payment_method="Credit Card", vendor="Comcast", type="expense"),
            models.Transaction(user_id=test_user.id, name="Power Bill", category="Rent & Utilities", amount=140.0, date=datetime.date(2026, 6, 10), payment_method="ACH", vendor="ConEd", type="expense"),
            models.Transaction(user_id=test_user.id, name="Consulting Revenue", category="Professional Services", amount=5000.0, date=datetime.date(2026, 6, 15), payment_method="Wire Transfer", vendor="Client A", type="income"),
        ]
        db.add_all(baseline_txs)
        db.commit()
        
        # Test normal bill
        normal_internet = 125.0
        is_anom, reason = detect_anomaly(db, test_user.id, normal_internet, "Rent & Utilities", "Comcast", "expense")
        print(f"  Comcast Internet bill ${normal_internet} -> Anomaly: {is_anom} {reason}")
        
        # Test outsized bill (e.g. Comcast bill of $1200)
        huge_internet = 1200.0
        is_anom, reason = detect_anomaly(db, test_user.id, huge_internet, "Rent & Utilities", "Comcast", "expense")
        print(f"  Comcast Internet bill ${huge_internet} -> Anomaly: {is_anom} (Reason: {reason})")
        print("[OK] Anomaly detector completed test runs!")

        # 4. Test Cash Flow Forecasting
        print("\nTesting Cash Flow Forecasting...")
        forecast_results = get_historical_and_forecast_data(db, test_user.id)
        print(f"  Historical points parsed: {len(forecast_results['historical'])}")
        print(f"  Forecasted points predicted: {len(forecast_results['forecast'])}")
        print(f"  Next Month Revenue Prediction: ${forecast_results['metrics']['next_month_revenue']}")
        print(f"  Next Month Expense Prediction: ${forecast_results['metrics']['next_month_expenses']}")
        print("[OK] Cash flow forecaster completed test runs!")

        # Clean up database records
        db.delete(test_user)
        db.commit()
        print("\nCleaned up database test records successfully.")
        print("---------------------------------------------")
        print("Backend Tests Completed Successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Test Failed: {e}")
        print("---------------------------------------------")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
