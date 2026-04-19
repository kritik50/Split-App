from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)

    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    amount = Column(Float, nullable=False)
    notes = Column(String, nullable=True)

    # ✅ ADDED: Timestamp for when expense was created
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🔥 IMPORTANT (keep this)
    splits = relationship(
        "ExpenseSplit",
        back_populates="expense",
        cascade="all, delete"
    )