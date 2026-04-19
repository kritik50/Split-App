from pydantic import BaseModel, EmailStr
from typing import Optional


# ✅ Changed from user_id to email — users don't know each other's IDs
class AddMemberRequest(BaseModel):
    email: EmailStr


class MemberResponse(BaseModel):
    user_id: int
    group_id: int
    role: str
    name: str           # ✅ NEW: user's display name
    email: str          # ✅ NEW: user's email

    class Config:
        from_attributes = True