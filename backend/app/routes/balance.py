from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from app.models.balance import Balance
from app.models.group_member import GroupMember
from app.models.user import User
from app.dependencies.auth import get_current_user


router = APIRouter(prefix="/balances", tags=["Balances"])


@router.get("/group/{group_id}")
def get_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # 🔴 Check user is part of group
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    balances = db.query(Balance).filter(
        Balance.group_id == group_id
    ).all()

    # 🧠 Fetch all users (avoid multiple DB calls)
    user_ids = set()
    for b in balances:
        user_ids.add(b.user_owes_id)
        user_ids.add(b.user_gets_id)

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u.name for u in users}

    # 🔥 Full ledger (readable)
    all_balances = []
    for b in balances:
        all_balances.append({
            "from_user": user_map.get(b.user_owes_id, "Unknown"),
            "to_user": user_map.get(b.user_gets_id, "Unknown"),
            "amount": round(b.amount, 2)
        })

    # 🔥 Personal view
    you_owe = []
    you_are_owed = []

    for b in balances:
        if b.user_owes_id == current_user.id:
            you_owe.append({
                "to": user_map.get(b.user_gets_id, "Unknown"),
                "amount": round(b.amount, 2)
            })

        elif b.user_gets_id == current_user.id:
            you_are_owed.append({
                "from": user_map.get(b.user_owes_id, "Unknown"),
                "amount": round(b.amount, 2)
            })

    return {
        "group_id": group_id,
        "all_balances": all_balances,
        "you_owe": you_owe,
        "you_are_owed": you_are_owed
    }