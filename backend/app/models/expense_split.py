from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)

    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id"))

    amount = Column(Float, nullable=False)

    # Relationship back to expense
    expense = relationship("Expense", back_populates="splits")