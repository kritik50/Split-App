from pydantic import BaseModel


class GroupCreate(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: int
    name: str
    created_by: int

    class Config:
        from_attributes = True