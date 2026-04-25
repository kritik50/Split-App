from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base  # your Base from db setup

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    upi_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)