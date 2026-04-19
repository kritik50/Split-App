from sqlalchemy import Column, Integer, ForeignKey, Float
from sqlalchemy.orm import relationship

from database import Base


class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)

    group_id = Column(Integer, ForeignKey("groups.id"))
    user_owes_id = Column(Integer, ForeignKey("users.id"))
    user_gets_id = Column(Integer, ForeignKey("users.id"))

    amount = Column(Float, default=0)

    group = relationship("Group")
    user_owes = relationship("User", foreign_keys=[user_owes_id])
    user_gets = relationship("User", foreign_keys=[user_gets_id])