import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sqlalchemy.orm import Session
from app.db import models

# Base training dataset for common business transactions
BASE_DATA = [
    # Transport & Travel
    ("uber trip", "Transport & Travel"),
    ("lyft ride", "Transport & Travel"),
    ("bolt ride", "Transport & Travel"),
    ("yellow cab taxi", "Transport & Travel"),
    ("delta airlines flight", "Transport & Travel"),
    ("united airlines baggage", "Transport & Travel"),
    ("chevron fuel gas", "Transport & Travel"),
    ("shell oil station", "Transport & Travel"),
    ("exxon gas purchase", "Transport & Travel"),
    ("hertz car rental", "Transport & Travel"),
    ("avis rent a car", "Transport & Travel"),
    
    # Food & Beverage
    ("starbucks coffee", "Food & Beverage"),
    ("mcdonalds lunch", "Food & Beverage"),
    ("subway sandwich", "Food & Beverage"),
    ("uber eats delivery", "Food & Beverage"),
    ("door dash delivery", "Food & Beverage"),
    ("whole foods grocery", "Food & Beverage"),
    ("kroger supermarket", "Food & Beverage"),
    ("dunkin donuts", "Food & Beverage"),
    ("business dinner restaurant", "Food & Beverage"),
    ("catering service lunch", "Food & Beverage"),

    # Cloud Services & Hosting
    ("amazon aws hosting", "Cloud Services & Hosting"),
    ("google cloud gcp", "Cloud Services & Hosting"),
    ("microsoft azure", "Cloud Services & Hosting"),
    ("digitalocean droplet", "Cloud Services & Hosting"),
    ("heroku database", "Cloud Services & Hosting"),
    ("cloudflare domain ssl", "Cloud Services & Hosting"),
    ("godaddy domain renewal", "Cloud Services & Hosting"),
    
    # Marketing & Advertising
    ("google ads marketing", "Marketing & Advertising"),
    ("facebook ads marketing", "Marketing & Advertising"),
    ("meta ads", "Marketing & Advertising"),
    ("linkedin premium ads", "Marketing & Advertising"),
    ("mailchimp newsletter", "Marketing & Advertising"),
    ("hubspot marketing suite", "Marketing & Advertising"),
    ("semrush seo tool", "Marketing & Advertising"),
    ("canva design subscription", "Marketing & Advertising"),
    
    # Software & Subscriptions
    ("microsoft 365 license", "Software & Subscriptions"),
    ("google workspace email", "Software & Subscriptions"),
    ("slack technologies", "Software & Subscriptions"),
    ("zoom video conference", "Software & Subscriptions"),
    ("github co-pilot pro", "Software & Subscriptions"),
    ("openai api chatgpt", "Software & Subscriptions"),
    ("adobe creative cloud", "Software & Subscriptions"),
    ("jira atlassian", "Software & Subscriptions"),
    ("notion workspace", "Software & Subscriptions"),
    ("figma design team", "Software & Subscriptions"),
    
    # Office Supplies & Equipment
    ("staples office printer paper", "Office Supplies & Equipment"),
    ("office depot pens notebooks", "Office Supplies & Equipment"),
    ("amazon office chair desk", "Office Supplies & Equipment"),
    ("best buy laptop keyboard", "Office Supplies & Equipment"),
    ("apple store macbook", "Office Supplies & Equipment"),
    
    # Rent & Utilities
    ("wework desk office rent", "Rent & Utilities"),
    ("regus co-working space rent", "Rent & Utilities"),
    ("comcast xfinity internet office", "Rent & Utilities"),
    ("at&t business mobile data", "Rent & Utilities"),
    ("verizon business phone", "Rent & Utilities"),
    ("conedison electric bill", "Rent & Utilities"),
    ("municipal water utility", "Rent & Utilities"),
    ("landlord office rent payment", "Rent & Utilities"),
    
    # Salaries & Benefits
    ("monthly payroll deposit", "Salaries & Benefits"),
    ("gusto payroll processing fees", "Salaries & Benefits"),
    ("employee health insurance premium", "Salaries & Benefits"),
    ("contractor payment invoice", "Salaries & Benefits"),
    ("rippling payroll direct deposit", "Salaries & Benefits"),

    # Professional Services
    ("legal consulting fees attorney", "Professional Services"),
    ("accounting bookkeeping tax advice", "Professional Services"),
    ("business insurance premium", "Professional Services"),
    ("consultant contract development", "Professional Services"),
]

class TransactionClassifier:
    def __init__(self):
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True, stop_words='english')),
            ('clf', LogisticRegression(C=1.0, max_iter=200, class_weight='balanced'))
        ])
        self.is_trained = False
        # Train immediately with base dataset
        self.train_base()

    def train_base(self):
        texts = [item[0] for item in BASE_DATA]
        labels = [item[1] for item in BASE_DATA]
        self.pipeline.fit(texts, labels)
        self.is_trained = True

    def train_from_db(self, db: Session, user_id: int):
        """Re-trains the model dynamically with the user's past categorized transactions"""
        try:
            # Fetch categorized expenses for this user
            user_tx = db.query(models.Transaction).filter(
                models.Transaction.user_id == user_id,
                models.Transaction.category != "Uncategorized"
            ).all()

            texts = [item[0] for item in BASE_DATA]
            labels = [item[1] for item in BASE_DATA]

            # Add user's transactions to the dataset
            for tx in user_tx:
                name_desc = f"{tx.name} {tx.vendor} {tx.description or ''}".lower()
                texts.append(name_desc)
                labels.append(tx.category)

            # Fit model
            if len(texts) > 5:
                self.pipeline.fit(texts, labels)
                self.is_trained = True
        except Exception as e:
            print(f"Error training from database: {e}")
            # Fallback to base
            self.train_base()

    def predict(self, text: str, vendor: str = "", description: str = "") -> str:
        """Predicts the category of a transaction"""
        if not self.is_trained:
            return "Miscellaneous"

        input_text = f"{text} {vendor} {description or ''}".lower().strip()
        if not input_text:
            return "Miscellaneous"

        try:
            pred = self.pipeline.predict([input_text])
            return pred[0]
        except Exception:
            return "Miscellaneous"

# Global single instance
classifier_model = TransactionClassifier()
