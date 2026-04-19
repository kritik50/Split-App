from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db

from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserLogin
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    REFRESH_SECRET_KEY
)

from jose import jwt, JWTError
from app.dependencies.auth import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])


# 🔹 SIGNUP
@router.post("/signup", response_model=UserResponse)
def signup(user: UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        password=hash_password(user.password),
        name=user.name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# 🔹 LOGIN
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    access_token = create_access_token({"user_id": db_user.id})
    refresh_token = create_refresh_token({"user_id": db_user.id})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# 🔹 CURRENT USER
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name
    }


# 🔹 RESET PASSWORD (FIXED)
@router.post("/reset-password")
def reset_password(
    email: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password = hash_password(new_password)
    db.commit()

    return {"message": "Password updated"}


# 🔹 REFRESH TOKEN (FIXED)
@router.post("/refresh")
def refresh_access_token(refresh_token: str = Body(...)):

    try:
        payload = jwt.decode(
            refresh_token,
            REFRESH_SECRET_KEY,
            algorithms=["HS256"]
        )

        new_access_token = create_access_token({
            "user_id": payload.get("user_id")
        })

        return {
            "access_token": new_access_token
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")