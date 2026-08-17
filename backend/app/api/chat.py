from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db import schemas, models
from app.auth.auth import get_current_user
from app.services.ai_service import ask_ai_chat

router = APIRouter(prefix="/chat", tags=["AI Financial Chat"])

@router.post("/", response_model=schemas.ChatResponse)
def post_chat(
    req: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sends user queries to the data-contextualized AI assistant and returns response."""
    if not req.message or req.message.strip() == "":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat message cannot be empty."
        )

    reply_text = ask_ai_chat(
        db, 
        user_id=current_user.id, 
        query=req.message, 
        history=req.history
    )
    return {"reply": reply_text}
