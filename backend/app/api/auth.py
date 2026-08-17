from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.database import get_db
from app.db import models, schemas
from app.auth import auth as auth_utils
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    # Check if this is the first user; if so, make them admin
    total_users = db.query(models.User).count()
    is_admin = True if total_users == 0 else False
    
    hashed_password = auth_utils.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        company_name=user_in.company_name,
        currency=user_in.currency,
        tax_rate=user_in.tax_rate,
        theme=user_in.theme,
        is_admin=is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Try to verify user
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_utils.create_access_token(
        data={"sub": user.email, "user_id": user.id}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user

@router.put("/profile", response_model=schemas.UserResponse)
def update_user_profile(
    profile_data: schemas.UserUpdate,
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    if profile_data.company_name is not None:
        current_user.company_name = profile_data.company_name
    if profile_data.currency is not None:
        current_user.currency = profile_data.currency
    if profile_data.tax_rate is not None:
        current_user.tax_rate = profile_data.tax_rate
    if profile_data.theme is not None:
        current_user.theme = profile_data.theme
    if profile_data.password is not None and profile_data.password != "":
        current_user.hashed_password = auth_utils.get_password_hash(profile_data.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/forgot-password")
def forgot_password(req: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Verify user exists
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        # Avoid user enumeration, pretend it works
        return {"message": "If this email exists in our system, a password reset link has been dispatched."}
    
    # We return a successful mock response as an MVP action
    return {"message": f"Password reset instructions successfully sent to {req.email}"}
