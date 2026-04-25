from pydantic import BaseModel, EmailStr
from datetime import datetime


# 👉 For Signup Request
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    upi_id: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    upi_id: str | None = None


# 👉 For Response (what we send back)
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    upi_id: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str