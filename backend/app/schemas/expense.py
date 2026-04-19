from pydantic import BaseModel
from typing import List, Optional


class SplitUser(BaseModel):
    user_id: int
    amount: Optional[float] = None
    percentage: Optional[float] = None


class ExpenseCreate(BaseModel):
    group_id: int
    amount: float
    paid_by: Optional[int] = None   # ✅ FIXED: was required int, backend auto-fills from JWT
    split_type: str = "equal"       # ✅ default to equal
    splits: List[SplitUser]
    notes: Optional[str] = None


class SplitResponse(BaseModel):
    user_id: int
    amount: float

    class Config:
        from_attributes = True


class ExpenseResponse(BaseModel):
    id: int
    group_id: int
    amount: float
    paid_by: int
    notes: Optional[str]
    splits: List[SplitResponse]

    class Config:
        from_attributes = True