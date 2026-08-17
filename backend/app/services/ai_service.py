import json
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
from openai import OpenAI
from app.config import settings
from app.db import models
from app.ml.classifier import classifier_model

# Initialize OpenAI Client
openai_client = None
if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("MOCK_"):
    try:
        openai_client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
    except Exception as e:
        print(f"OpenAI Client Init Error: {e}")

def get_financial_summary_context(db: Session, user_id: int) -> Dict[str, Any]:
    """Generates structured statistics from database for LLM prompt context or local heuristics."""
    now = datetime.date.today()
    this_month_start = datetime.date(now.year, now.month, 1)
    
    # Calculate last month start and end
    if now.month == 1:
        last_month_start = datetime.date(now.year - 1, 12, 1)
        last_month_end = datetime.date(now.year - 1, 12, 31)
    else:
        last_month_start = datetime.date(now.year, now.month - 1, 1)
        # last day of last month is day before this month start
        last_month_end = this_month_start - datetime.timedelta(days=1)

    # 1. Basic Stats (Overall)
    total_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "income"
    ).scalar() or 0.0

    total_expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense"
    ).scalar() or 0.0

    # 2. This Month vs Last Month
    cur_month_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "income",
        models.Transaction.date >= this_month_start
    ).scalar() or 0.0

    cur_month_expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.date >= this_month_start
    ).scalar() or 0.0

    last_month_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "income",
        models.Transaction.date >= last_month_start,
        models.Transaction.date <= last_month_end
    ).scalar() or 0.0

    last_month_expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.date >= last_month_start,
        models.Transaction.date <= last_month_end
    ).scalar() or 0.0

    # 3. Top Categories this month
    cat_spend = db.query(
        models.Transaction.category,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.date >= this_month_start
    ).group_by(models.Transaction.category).order_by(func.sum(models.Transaction.amount).desc()).all()

    top_categories = [{"category": c, "amount": float(t)} for c, t in cat_spend]

    # 4. Top Vendors this month
    vendor_spend = db.query(
        models.Transaction.vendor,
        func.sum(models.Transaction.amount).label("total")
    ).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense",
        models.Transaction.date >= this_month_start
    ).group_by(models.Transaction.vendor).order_by(func.sum(models.Transaction.amount).desc()).limit(5).all()

    top_vendors = [{"vendor": v, "amount": float(t)} for v, t in vendor_spend]

    # 5. Anomalies
    anomalies = db.query(models.Transaction).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.is_anomaly == True,
        models.Transaction.date >= this_month_start
    ).all()
    anomaly_list = [{"name": tx.name, "amount": tx.amount, "vendor": tx.vendor, "reason": tx.anomaly_reason} for tx in anomalies]

    # 6. Unused/Recurring Subscription Candidates
    recurring = db.query(
        models.Transaction.name,
        models.Transaction.vendor,
        models.Transaction.amount,
        func.count(models.Transaction.id).label("count")
    ).filter(
        models.Transaction.user_id == user_id,
        models.Transaction.type == "expense"
    ).group_by(
        models.Transaction.name, models.Transaction.vendor, models.Transaction.amount
    ).having(func.count(models.Transaction.id) >= 2).all()
    
    subscriptions = [{"name": n, "vendor": v, "amount": float(a), "occurrences": c} for n, v, a, c in recurring if "sub" in n.lower() or "member" in n.lower() or "renew" in n.lower() or c >= 3]

    # User Profile settings
    user = db.query(models.User).filter(models.User.id == user_id).first()

    return {
        "company_name": user.company_name if user else "Your Business",
        "currency": user.currency if user else "USD",
        "total_revenue": total_income,
        "total_expenses": total_expense,
        "net_worth": total_income - total_expense,
        "this_month": {
            "revenue": cur_month_income,
            "expenses": cur_month_expense,
            "net_profit": cur_month_income - cur_month_expense
        },
        "last_month": {
            "revenue": last_month_income,
            "expenses": last_month_expense,
            "net_profit": last_month_income - last_month_expense
        },
        "top_categories": top_categories,
        "top_vendors": top_vendors,
        "anomalies": anomaly_list,
        "subscriptions": subscriptions
    }

def generate_offline_insights(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """A highly analytical fallback logic to generate insights locally when AI is offline."""
    insights = []
    currency = context["currency"]
    
    # 1. Check MoM Spending
    cur_exp = context["this_month"]["expenses"]
    last_exp = context["last_month"]["expenses"]
    if last_exp > 0:
        increase_pct = ((cur_exp - last_exp) / last_exp) * 100
        if increase_pct > 10:
            insights.append({
                "type": "increase",
                "title": f"MoM Expenses Increased by {round(increase_pct, 1)}%",
                "message": f"Your business spent {currency} {round(cur_exp, 2)} this month, compared to {currency} {round(last_exp, 2)} last month. Consider reviewing your top categories.",
                "impact": f"-{currency} {round(cur_exp - last_exp, 2)}"
            })
        elif increase_pct < -10:
            insights.append({
                "type": "decrease",
                "title": f"MoM Expenses Decreased by {round(abs(increase_pct), 1)}%",
                "message": f"Great job! Monthly expenses dropped from {currency} {round(last_exp, 2)} to {currency} {round(cur_exp, 2)}.",
                "impact": f"+{currency} {round(last_exp - cur_exp, 2)}"
            })
            
    # 2. Check MoM Revenue
    cur_rev = context["this_month"]["revenue"]
    last_rev = context["last_month"]["revenue"]
    if last_rev > 0:
        rev_change = ((cur_rev - last_rev) / last_rev) * 100
        if rev_change > 5:
            insights.append({
                "type": "general",
                "title": f"Revenue Growth: +{round(rev_change, 1)}%",
                "message": f"Monthly revenue rose to {currency} {round(cur_rev, 2)} from {currency} {round(last_rev, 2)}.",
                "impact": f"+{currency} {round(cur_rev - last_rev, 2)}"
            })
            
    # 3. Add Category Analysis
    top_cats = context["top_categories"]
    if top_cats:
        highest = top_cats[0]
        total_m_exp = cur_exp if cur_exp > 0 else 1.0
        pct = (highest["amount"] / total_m_exp) * 100
        if pct > 25:
            insights.append({
                "type": "saving",
                "title": f"Concentrated Category Expense: {highest['category']}",
                "message": f"{highest['category']} represents {round(pct, 1)}% of your monthly expenditure, totaling {currency} {round(highest['amount'], 2)}.",
                "impact": "Optimization Potential"
            })

    # 4. Add Anomaly insights
    anoms = context["anomalies"]
    for anom in anoms[:2]: # Show up to 2
        insights.append({
            "type": "anomaly",
            "title": f"Unusual Transaction: {anom['name']}",
            "message": f"Flagged {currency} {round(anom['amount'], 2)} paid to {anom['vendor']}. Reason: {anom['reason']}",
            "impact": "Anomaly Detected"
        })

    # 5. Add Subscription Insight
    subs = context["subscriptions"]
    if subs:
        sub_total = sum(s["amount"] for s in subs)
        insights.append({
            "type": "saving",
            "title": "Review Active Subscriptions",
            "message": f"We detected {len(subs)} recurring or subscription charges costing approximately {currency} {round(sub_total, 2)} monthly. Cancel unused tools to boost margins.",
            "impact": f"Save up to {currency} {round(sub_total, 2)}/mo"
        })

    # Standard fallback defaults if no insights generated
    if not insights:
        insights.append({
            "type": "general",
            "title": "Financial Baseline Set",
            "message": "Welcome! Once you log more transactions or import financial records, AI will automatically analyze anomalies and generate cash recommendations.",
            "impact": "Pending Data"
        })

    return insights

def generate_ai_insights(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Generates insights using LLM, falling back to local analysis if unavailable."""
    context = get_financial_summary_context(db, user_id)
    
    # Check if OpenAI is initialized and available
    if openai_client:
        try:
            prompt = f"""
You are an expert AI Financial Advisor for small and medium businesses. 
Analyze the following financial summary data of a business and generate 3-5 high-quality, professional, and actionable business insights.
Each insight MUST fall into one of these categories: 'increase', 'decrease', 'anomaly', 'saving', or 'general'.
You MUST return ONLY a JSON array of objects with the following format:
[
  {{
    "type": "increase" | "decrease" | "anomaly" | "saving" | "general",
    "title": "Short title describing insight",
    "message": "Detail action-oriented description of the observation.",
    "impact": "Financial impact string, e.g. '+$150/mo' or '-$2,000' or 'Risk Detected'"
  }}
]

Business Data Context:
{json.dumps(context, indent=2)}

Do NOT output any markdown tags (like ```json) or explanation. Return raw JSON text only.
"""
            response = openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a professional business financial analyst that outputs strict JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=800
            )
            
            # Log usage
            prompt_tokens = response.usage.prompt_tokens if response.usage else 0
            completion_tokens = response.usage.completion_tokens if response.usage else 0
            log_ai_usage(db, user_id, "insights", prompt_tokens, completion_tokens)
            
            # Parse response
            res_content = response.choices[0].message.content.strip()
            # Clean up potential markdown formatting if returned
            if res_content.startswith("```"):
                lines = res_content.split("\n")
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    res_content = "\n".join(lines[1:-1])
            
            return json.loads(res_content)
        except Exception as e:
            print(f"AI Insights Generator Error: {e}, falling back to local algorithms.")
            
    return generate_offline_insights(context)

def run_local_chat_fallback(context: Dict[str, Any], query: str) -> str:
    """Answers specific business financial questions using local structured metrics."""
    q = query.lower()
    currency = context["currency"]
    
    if "highest spending" in q or "spend most" in q or "top category" in q or "category" in q:
        cats = context["top_categories"]
        if not cats:
            return "You don't have any recorded expenses for this month yet. Go ahead and add some transactions to see your top categories!"
        
        reply = "Here are your highest spending categories for this month:\n\n"
        for i, c in enumerate(cats[:5], 1):
            reply += f"{i}. **{c['category']}**: {currency} {round(c['amount'], 2)}\n"
        
        # Calculate percentage for the highest
        total_exp = context["this_month"]["expenses"]
        if total_exp > 0:
            top_pct = (cats[0]["amount"] / total_exp) * 100
            reply += f"\nYour top category ({cats[0]['category']}) represents **{round(top_pct, 1)}%** of your total monthly expenditures."
        return reply

    if "revenue" in q or "income" in q or "profit" in q or "earnings" in q:
        this_m_prof = context["this_month"]["net_profit"]
        last_m_prof = context["last_month"]["net_profit"]
        
        reply = f"### Financial Profitability Summary\n\n"
        reply += f"* **This Month's Revenue:** {currency} {round(context['this_month']['revenue'], 2)}\n"
        reply += f"* **This Month's Expenses:** {currency} {round(context['this_month']['expenses'], 2)}\n"
        reply += f"* **This Month's Net Profit:** {currency} {round(this_m_prof, 2)}\n\n"
        
        if context["last_month"]["revenue"] > 0:
            reply += f"Compared to last month, your revenue has changed by "
            rev_mom = ((context['this_month']['revenue'] - context['last_month']['revenue']) / context['last_month']['revenue']) * 100
            reply += f"**{'+' if rev_mom >=0 else ''}{round(rev_mom, 1)}%**."
            
        return reply

    if "anomaly" in q or "unusual" in q or "outlier" in q:
        anoms = context["anomalies"]
        if not anoms:
            return "No unusual expenses or outliers have been detected in your accounts this month. We continuously scan transaction amounts against your historical vendor and category standards."
        
        reply = "We've detected the following unusual expenses this month:\n\n"
        for an in anoms:
            reply += f"* **{an['name']}** paid to **{an['vendor']}**: {currency} {round(an['amount'], 2)}\n"
            reply += f"  _Reason:_ {an['reason']}\n\n"
        reply += "We recommend verifying these receipts or invoices to protect against billing errors or unauthorized card activity."
        return reply

    if "improve" in q or "profitability" in q or "recommendation" in q or "save" in q or "subscription" in q:
        subs = context["subscriptions"]
        reply = "### AI Recommendations for Profitability\n\n"
        
        # Recommendation 1: Subscriptions
        if subs:
            total_sub_cost = sum(s["amount"] for s in subs)
            reply += f"1. **Unify & Cancel Subscriptions:** We identified {len(subs)} repeating payments totalling **{currency} {round(total_sub_cost, 2)}/month**. Look at services like *{', '.join([s['vendor'] for s in subs[:3]])}* and cancel any accounts that overlap or are no longer in active use.\n"
        else:
            reply += "1. **Optimize Vendor Terms:** Review contracts with your top suppliers. Try negotiating net-30 terms or early payment discounts to keep cash in your accounts longer.\n"
            
        # Recommendation 2: Spending concentration
        cats = context["top_categories"]
        if cats:
            reply += f"2. **Category Target:** Your largest spending category is **{cats[0]['category']}**. If you reduce this category's expenses by just 10%, you would save **{currency} {round(cats[0]['amount'] * 0.1, 2)}** this month.\n"
            
        # Recommendation 3: Tax planning
        reply += "3. **Track Write-Offs:** Ensure all business lunches, travel, and software expenses are properly categorized. This reduces your net taxable profit at year-end, yielding major tax savings.\n"
        
        return reply

    if "summarize" in q or "summary" in q or "compare" in q:
        this_m = context["this_month"]
        last_m = context["last_month"]
        
        reply = f"### Month-Over-Month Comparison\n\n"
        reply += f"| Metric | Last Month | This Month | Change |\n"
        reply += f"| :--- | :--- | :--- | :--- |\n"
        
        # Revenue row
        rev_diff = this_m["revenue"] - last_m["revenue"]
        rev_pct = (rev_diff / last_m["revenue"] * 100) if last_m["revenue"] > 0 else 0
        rev_change_str = f"{'+' if rev_diff >= 0 else ''}{round(rev_pct, 1)}%" if last_m["revenue"] > 0 else "N/A"
        reply += f"| **Revenue** | {currency} {round(last_m['revenue'], 2)} | {currency} {round(this_m['revenue'], 2)} | {rev_change_str} |\n"
        
        # Expenses row
        exp_diff = this_m["expenses"] - last_m["expenses"]
        exp_pct = (exp_diff / last_m["expenses"] * 100) if last_m["expenses"] > 0 else 0
        exp_change_str = f"{'+' if exp_diff >= 0 else ''}{round(exp_pct, 1)}%" if last_m["expenses"] > 0 else "N/A"
        reply += f"| **Expenses** | {currency} {round(last_m['expenses'], 2)} | {currency} {round(this_m['expenses'], 2)} | {exp_change_str} |\n"
        
        # Net Profit row
        prof_diff = this_m["net_profit"] - last_m["net_profit"]
        prof_pct = (prof_diff / abs(last_m["net_profit"]) * 100) if last_m["net_profit"] != 0 else 0
        prof_change_str = f"{'+' if prof_diff >= 0 else ''}{round(prof_pct, 1)}%" if last_m["net_profit"] != 0 else "N/A"
        reply += f"| **Net Profit** | {currency} {round(last_m['net_profit'], 2)} | {currency} {round(this_m['net_profit'], 2)} | {prof_change_str} |\n\n"
        
        if this_m["net_profit"] > last_m["net_profit"]:
            reply += "📈 Your margins improved this month. This is driven by positive cash control or increased billings."
        else:
            reply += "📉 Cash flow margins are down this month. Focus on reducing discretionary software/office overheads."
        return reply

    # Default generic local greeting incorporating stats
    return f"Hello! I am your AI Financial Assistant for **{context['company_name']}**. " \
           f"Currently, your total cash balance is estimated at **{currency} {round(context['net_worth'], 2)}** " \
           f"(Revenue: {currency} {round(context['total_revenue'], 2)} | Expenses: {currency} {round(context['total_expenses'], 2)}).\n\n" \
           f"How can I help you today? You can ask me questions like:\n" \
           f"* _\"Show my highest spending category.\"_\n" \
           f"* _\"Why did my expenses increase?\"_ (summarize comparisons)\n" \
           f"* _\"Are there any anomalies this month?\"_\n" \
           f"* _\"How can I improve profitability?\"_"

def ask_ai_chat(db: Session, user_id: int, query: str, history: List[Dict[str, str]] = None) -> str:
    """Answers customer messages using ChatGPT loaded with full company metrics context, falling back to local logic."""
    context = get_financial_summary_context(db, user_id)
    
    if openai_client:
        try:
            # Build history list
            messages = [
                {
                    "role": "system",
                    "content": f"You are a helpful, professional, and precise SaaS AI Financial Assistant. "
                               f"You are speaking to the business owner of '{context['company_name']}'. "
                               f"Use the following real-time database context to answer their query directly. "
                               f"Do not guess. Answer based on facts. Keep your answers concise, structured in clean markdown, "
                               f"and explain any financial terms. Use currency {context['currency']} for formatting values.\n\n"
                               f"Business Financial Context:\n{json.dumps(context, indent=2)}"
                }
            ]
            
            # Append conversation history
            if history:
                for msg in history[-8:]: # Last 8 interactions for token efficiency
                    messages.append({"role": msg["role"], "content": msg["content"]})
                    
            messages.append({"role": "user", "content": query})
            
            response = openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=1000
            )
            
            # Log usage
            prompt_tokens = response.usage.prompt_tokens if response.usage else 0
            completion_tokens = response.usage.completion_tokens if response.usage else 0
            log_ai_usage(db, user_id, "chat", prompt_tokens, completion_tokens)
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"AI Chat Assistant Error: {e}, falling back to local rule-based answers.")

    return run_local_chat_fallback(context, query)

def categorize_transaction_ai(db: Session, user_id: int, name: str, vendor: str, description: str) -> str:
    """Categorizes a single transaction, using LLM if available, otherwise ML classifier."""
    if openai_client:
        try:
            prompt = f"""
You are an accounting classifier. Categorize this business transaction into exactly ONE of the following standard categories:
- Transport & Travel
- Food & Beverage
- Cloud Services & Hosting
- Marketing & Advertising
- Software & Subscriptions
- Office Supplies & Equipment
- Rent & Utilities
- Salaries & Benefits
- Professional Services
- Miscellaneous

Transaction Details:
Name: {name}
Vendor: {vendor}
Description: {description}

Output ONLY the category name. Do not explain your choice.
"""
            response = openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a precise accounting categorizer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=30
            )
            
            # Log usage
            prompt_tokens = response.usage.prompt_tokens if response.usage else 0
            completion_tokens = response.usage.completion_tokens if response.usage else 0
            log_ai_usage(db, user_id, "categorization", prompt_tokens, completion_tokens)
            
            predicted_cat = response.choices[0].message.content.strip()
            
            # Verify it's a valid category
            valid_categories = {
                "Transport & Travel", "Food & Beverage", "Cloud Services & Hosting", 
                "Marketing & Advertising", "Software & Subscriptions", "Office Supplies & Equipment",
                "Rent & Utilities", "Salaries & Benefits", "Professional Services", "Miscellaneous"
            }
            if predicted_cat in valid_categories:
                return predicted_cat
        except Exception as e:
            print(f"AI Categorization error: {e}, using local machine learning model.")

    # Fallback to local scikit-learn classifier model
    return classifier_model.predict(name, vendor, description)

def log_ai_usage(db: Session, user_id: int, feature: str, prompt_tokens: int, completion_tokens: int):
    """Logs token usages for admin billing / performance statistics."""
    try:
        usage = models.AIUsage(
            user_id=user_id,
            feature=feature,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens
        )
        db.add(usage)
        db.commit()
    except Exception as e:
        print(f"Failed to log AI usage: {e}")
        db.rollback()
