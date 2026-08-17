import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Financial Assistant"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "b3a4c49d8c0b5f1f912e93b1d3d63c5d6f1a8c9e4b7e8d9c0a1b2c3d4e5f6a7b")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database: Default to SQLite, can override with MySQL connection string
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./financial_assistant.db"
    )

    # AI Config
    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY", 
        "AQ.Ab8RN6JARvLawpRxcxfirdd5ge-E3HuLYPPFLktH5jqQ1-zqGg"
    )
    OPENAI_BASE_URL: str = os.getenv(
        "OPENAI_BASE_URL", 
        "https://api.openai.com/v1"
    )
    OPENAI_MODEL: str = os.getenv(
        "OPENAI_MODEL", 
        "gpt-4o-mini"
    )

    class Config:
        case_sensitive = True

settings = Settings()
