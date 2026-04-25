from passlib.context import CryptContext
from jose import jwt, JWTError, ExpiredSignatureError 
from datetime import datetime, timedelta
from fastapi import HTTPException

import os

# 🔐 JWT Config
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_SECRET_KEY = os.getenv("REFRESH_SECRET_KEY", "refresh_secret")
REFRESH_EXPIRE_DAYS = 7

# 🔐 Password Hashing Config
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# 🔐 Hash password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# 🔍 Verify password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# 🔥 Create JWT token
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "sub": str(data["user_id"])   # 🔥 ADD THIS
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


# 🔥 NEW: Decode JWT token

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("PAYLOAD:", payload)   # 🔥 DEBUG

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return int(user_id)

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except JWTError as e:
        print("JWT ERROR:", str(e))   # 🔥 VERY IMPORTANT
        raise HTTPException(status_code=401, detail="Invalid token")