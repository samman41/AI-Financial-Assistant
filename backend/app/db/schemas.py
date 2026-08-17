from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    currency: str = "USD"
    tax_rate: float = 0.0
    theme: str = "dark"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    currency: Optional[str] = None
    tax_rate: Optional[float] = None
    theme: Optional[str] = None
    password: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Schemas
class TransactionBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    amount: float
    date: date
    payment_method: str
    vendor: str
    type: str = "expense" # 'income' or 'expense'
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None
    payment_method: Optional[str] = None
    vendor: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    is_anomaly: bool
    anomaly_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionPreview(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    amount: float
    date: date
    payment_method: str
    vendor: str
    type: str
    is_valid: bool = True
    errors: List[str] = []

# File Import Schemas
class ImportedFileResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    row_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ImportCommitRequest(BaseModel):
    transactions: List[TransactionBase]

# AI and Insights Schemas
class AIInsight(BaseModel):
    type: str  # 'increase', 'decrease', 'anomaly', 'saving', 'general'
    title: str
    message: str
    impact: Optional[str] = None

class AIInsightsResponse(BaseModel):
    insights: List[AIInsight]

class ForecastItem(BaseModel):
    date: str
    revenue: float
    expenses: float
    net_profit: float
    cash_balance: float

class ForecastResponse(BaseModel):
    historical: List[ForecastItem]
    forecast: List[ForecastItem]
    metrics: Dict[str, float]  # next_month_revenue, next_month_expenses, expected_profit, projected_cash_balance

# Chat Schemas
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    reply: str

# Admin Schemas
class AIUsageStats(BaseModel):
    feature: str
    count: int
    estimated_tokens: int

class SystemHealth(BaseModel):
    database_connected: bool
    total_users: int
    total_transactions: int
    database_type: str

class UserAdminResponse(UserResponse):
    transaction_count: int
    last_active: Optional[datetime] = None
