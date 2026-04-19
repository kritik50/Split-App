from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())