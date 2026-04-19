from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


class Settlement(Base):
    __tablename__ = "settlements"

    id = Column(Integer, primary_key=True, index=True)

    group_id = Column(Integer, ForeignKey("groups.id"))
    paid_by = Column(Integer, ForeignKey("users.id"))   # who paid
    paid_to = Column(Integer, ForeignKey("users.id"))   # who received
    amount = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group")
    payer = relationship("User", foreign_keys=[paid_by])
    receiver = relationship("User", foreign_keys=[paid_to])