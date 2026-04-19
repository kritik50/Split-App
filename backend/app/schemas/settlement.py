from pydantic import BaseModel
from datetime import datetime


class SettlementCreate(BaseModel):
    group_id: int
    paid_to: int
    amount: float


class SettlementResponse(BaseModel):
    id: int
    group_id: int
    paid_by: int
    paid_to: int
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True