from pydantic import BaseModel
from typing import Optional


class GroupCreate(BaseModel):
    name: str
    category: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    created_by: int

    class Config:
        from_attributes = True