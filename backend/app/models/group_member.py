from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, UniqueConstraint
from sqlalchemy.sql import func
from database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    role = Column(String, default="member")   # "admin" | "member"
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # ✅ Prevents adding the same user to the same group twice at the DB level
    __table_args__ = (
        UniqueConstraint("user_id", "group_id", name="uq_group_user"),
    )