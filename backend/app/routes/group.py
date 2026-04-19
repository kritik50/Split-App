from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.models.balance import Balance
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit

from app.schemas.group import GroupCreate, GroupResponse
from app.schemas.group_member import AddMemberRequest, MemberResponse

from app.dependencies.auth import get_current_user


router = APIRouter(prefix="/groups", tags=["Groups"])


# ─────────────────────────────────────────────
# HELPER: build MemberResponse with user name
# ─────────────────────────────────────────────
def _build_member_response(member: GroupMember, db: Session) -> dict:
    user = db.query(User).filter(User.id == member.user_id).first()
    return {
        "user_id": member.user_id,
        "group_id": member.group_id,
        "role": member.role,
        "name": user.name if user else f"User {member.user_id}",
        "email": user.email if user else "",
    }


# ─────────────────────────────────────────────
# CREATE GROUP + AUTO ADD CREATOR AS ADMIN
# ─────────────────────────────────────────────
@router.post("/", response_model=GroupResponse)
def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_group = Group(
        name=group.name,
        created_by=current_user.id
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    creator_member = GroupMember(
        user_id=current_user.id,
        group_id=new_group.id,
        role="admin"
    )

    db.add(creator_member)
    db.commit()

    return new_group


# ─────────────────────────────────────────────
# GET ALL GROUPS FOR CURRENT USER
# ─────────────────────────────────────────────
@router.get("/", response_model=list[GroupResponse])
def get_groups(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return (
        db.query(Group)
        .join(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )


# ─────────────────────────────────────────────
# ADD MEMBER BY EMAIL (fixed from user_id)
# ─────────────────────────────────────────────
@router.post("/{group_id}/members", response_model=MemberResponse)
def add_member(
    group_id: int,
    data: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # 1. Group must exist
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # 2. Current user must be admin
    admin = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin"
    ).first()

    if not admin:
        raise HTTPException(status_code=403, detail="Only an admin can add members")

    # 3. Find user by email
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for '{data.email}'. Ask them to register first."
        )

    # 4. Can't add yourself (you're already in)
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You are already in this group")

    # 5. Check for duplicate
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail=f"{user.name} is already in this group")

    # 6. Add the member
    member = GroupMember(
        user_id=user.id,
        group_id=group_id,
        role="member"
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return _build_member_response(member, db)


# ─────────────────────────────────────────────
# LIST MEMBERS WITH NAMES
# ─────────────────────────────────────────────
@router.get("/{group_id}/members", response_model=list[MemberResponse])
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify requester is in the group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    members = db.query(GroupMember).filter(
        GroupMember.group_id == group_id
    ).all()

    return [_build_member_response(m, db) for m in members]


# ─────────────────────────────────────────────
# GROUP SUMMARY
# ─────────────────────────────────────────────
@router.get("/{group_id}/summary")
def get_group_summary(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Total balances (sum of all outstanding amounts in this group)
    balances = db.query(Balance).filter(Balance.group_id == group_id).all()
    total_owed = sum(b.amount for b in balances)

    # Count actual expense records (not balance rows)
    total_expenses = db.query(Expense).filter(Expense.group_id == group_id).count()

    # Count members
    total_members = db.query(GroupMember).filter(GroupMember.group_id == group_id).count()

    return {
        "group_id": group_id,
        "group_name": group.name,
        "total_owed": round(total_owed, 2),
        "total_transactions": total_expenses,   # ✅ FIXED: actual expense count, not balance rows
        "total_members": total_members,
    }


# ─────────────────────────────────────────────
# GROUP BALANCES — FIXED (b.user_id didn't exist)
# ─────────────────────────────────────────────
@router.get("/{group_id}/balances")
def get_group_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    balances = db.query(Balance).filter(Balance.group_id == group_id).all()

    # Collect all user IDs we need names for
    user_ids = set()
    for b in balances:
        user_ids.add(b.user_owes_id)
        user_ids.add(b.user_gets_id)

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: {"name": u.name, "email": u.email} for u in users}

    # ✅ FIXED: was using b.user_id which doesn't exist on Balance model
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


# ─────────────────────────────────────────────
# DELETE GROUP (cascade-safe)
# ─────────────────────────────────────────────
@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        group = db.query(Group).filter(Group.id == group_id).first()

        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        # Only members can delete (admin check optional — you can tighten this later)
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete in correct FK order
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