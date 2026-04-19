from pydantic import BaseModel, EmailStr
from datetime import datetime


# 👉 For Signup Request
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


# 👉 For Response (what we send back)
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str