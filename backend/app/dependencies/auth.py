from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.services.auth import decode_access_token


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials  # ✅ already clean token

    try:
        user_id = decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user