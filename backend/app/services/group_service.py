from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.models.balance import Balance
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.schemas.group import GroupCreate
from app.schemas.group_member import AddMemberRequest


class GroupService:
    @staticmethod
    def _build_member_response(member: GroupMember, db: Session) -> dict:
        user = db.query(User).filter(User.id == member.user_id).first()
        return {
            "user_id": member.user_id,
            "group_id": member.group_id,
            "role": member.role,
            "name": user.name if user else f"User {member.user_id}",
            "email": user.email if user else "",
        }

    @staticmethod
    def create_group(db: Session, group_data: GroupCreate, user_id: int) -> Group:
        new_group = Group(
            name=group_data.name,
            created_by=user_id
        )
        db.add(new_group)
        db.commit()
        db.refresh(new_group)

        creator_member = GroupMember(
            user_id=user_id,
            group_id=new_group.id,
            role="admin"
        )
        db.add(creator_member)
        db.commit()

        return new_group

    @staticmethod
    def get_user_groups(db: Session, user_id: int):
        return (
            db.query(Group)
            .join(GroupMember)
            .filter(GroupMember.user_id == user_id)
            .all()
        )

    @staticmethod
    def add_member(db: Session, group_id: int, data: AddMemberRequest, current_user_id: int) -> dict:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        admin = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id,
            GroupMember.role == "admin"
        ).first()

        if not admin:
            raise HTTPException(status_code=403, detail="Only an admin can add members")

        user = db.query(User).filter(User.email == data.email).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"No account found for '{data.email}'. Ask them to register first."
            )

        if user.id == current_user_id:
            raise HTTPException(status_code=400, detail="You are already in this group")

        existing = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail=f"{user.name} is already in this group")

        member = GroupMember(
            user_id=user.id,
            group_id=group_id,
            role="member"
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        return GroupService._build_member_response(member, db)

    @staticmethod
    def list_members(db: Session, group_id: int, current_user_id: int) -> list[dict]:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        members = db.query(GroupMember).filter(
            GroupMember.group_id == group_id
        ).all()

        return [GroupService._build_member_response(m, db) for m in members]

    @staticmethod
    def get_group_summary(db: Session, group_id: int, current_user_id: int) -> dict:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        balances = db.query(Balance).filter(Balance.group_id == group_id).all()
        total_owed = sum(b.amount for b in balances)
        total_expenses = db.query(Expense).filter(Expense.group_id == group_id).count()
        total_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()

        return {
            "group_id": group_id,
            "group_name": group.name,
            "total_owed": round(total_owed, 2),
            "total_transactions": total_expenses,
            "total_members": total_members,
        }

    @staticmethod
    def get_group_balances(db: Session, group_id: int, current_user_id: int) -> list[dict]:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        balances = db.query(Balance).filter(Balance.group_id == group_id).all()
        user_ids = set()
        for b in balances:
            user_ids.add(b.user_owes_id)
            user_ids.add(b.user_gets_id)

        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: {"name": u.name, "email": u.email} for u in users}

        return [
            {
                "from_user_id": b.user_owes_id,
                "from_user_name": user_map.get(b.user_owes_id, {}).get("name", f"User {b.user_owes_id}"),
                "to_user_id": b.user_gets_id,
                "to_user_name": user_map.get(b.user_gets_id, {}).get("name", f"User {b.user_gets_id}"),
                "amount": round(b.amount, 2),
            }
            for b in balances
        ]

    @staticmethod
    def remove_member(db: Session, group_id: int, user_id_to_remove: int, current_user_id: int) -> dict:
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        member_to_remove = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id_to_remove
        ).first()

        if not member_to_remove:
            raise HTTPException(status_code=404, detail="User is not in this group")

        is_self = (user_id_to_remove == current_user_id)
        
        if not is_self:
            admin = db.query(GroupMember).filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user_id,
                GroupMember.role == "admin"
            ).first()
            if not admin:
                raise HTTPException(status_code=403, detail="Only an admin can remove other members")

        outstanding_balances = db.query(Balance).filter(
            Balance.group_id == group_id,
            (Balance.user_owes_id == user_id_to_remove) | (Balance.user_gets_id == user_id_to_remove),
            Balance.amount > 0
        ).first()

        if outstanding_balances:
            raise HTTPException(status_code=400, detail="Cannot remove user with outstanding balances")

        db.delete(member_to_remove)
        db.commit()

        return {"message": "User removed from group successfully"}

    @staticmethod
    def delete_group(db: Session, group_id: int, current_user_id: int) -> dict:
        try:
            group = db.query(Group).filter(Group.id == group_id).first()
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")

            member = db.query(GroupMember).filter(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user_id
            ).first()

            if not member:
                raise HTTPException(status_code=403, detail="Access denied")

            expenses = db.query(Expense).filter(Expense.group_id == group_id).all()
            expense_ids = [e.id for e in expenses]

            if expense_ids:
                db.query(ExpenseSplit).filter(
                    ExpenseSplit.expense_id.in_(expense_ids)
                ).delete(synchronize_session=False)

            db.query(Expense).filter(Expense.group_id == group_id).delete(synchronize_session=False)
            db.query(Balance).filter(Balance.group_id == group_id).delete(synchronize_session=False)
            db.query(GroupMember).filter(GroupMember.group_id == group_id).delete(synchronize_session=False)

            db.delete(group)
            db.commit()

            return {"message": "Group deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            print("DELETE ERROR:", str(e))
            raise HTTPException(status_code=500, detail=f"Failed to delete group: {str(e)}")
