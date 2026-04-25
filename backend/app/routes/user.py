from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.models.balance import Balance
from app.models.expense import Expense
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.user import UserUpdate, UserResponse
from database import get_db


router = APIRouter(prefix="/users", tags=["Users"])


@router.put("/me", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if data.name:
        current_user.name = data.name
    if data.upi_id:
        current_user.upi_id = data.upi_id
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search")
def search_user_by_email(
    email: str = Query(..., description="Email address to search for"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with that email")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


@router.get("/activity")
def get_user_activity(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    group_ids = [membership.group_id for membership in memberships]

    if not group_ids:
        return []

    expenses = db.query(Expense).filter(Expense.group_id.in_(group_ids)).all()
    settlements = (
        db.query(Settlement)
        .filter(Settlement.group_id.in_(group_ids))
        .all()
    )

    user_ids = set()
    for expense in expenses:
        user_ids.add(expense.paid_by)
    for settlement in settlements:
        user_ids.add(settlement.paid_by)
        user_ids.add(settlement.paid_to)

    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {user.id: user.name for user in users}

    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    group_map = {group.id: group.name for group in groups}

    timeline = []

    for expense in expenses:
        timeline.append({
            "type": "expense",
            "id": expense.id,
            "group_id": expense.group_id,
            "group_name": group_map.get(expense.group_id, "Group"),
            "paid_by": user_map.get(expense.paid_by, "Unknown"),
            "amount": round(expense.amount, 2),
            "notes": expense.notes,
            "created_at": expense.created_at,
        })

    for settlement in settlements:
        timeline.append({
            "type": "settlement",
            "id": settlement.id,
            "group_id": settlement.group_id,
            "group_name": group_map.get(settlement.group_id, "Group"),
            "paid_by": user_map.get(settlement.paid_by, "Unknown"),
            "paid_to": user_map.get(settlement.paid_to, "Unknown"),
            "amount": round(settlement.amount, 2),
            "created_at": settlement.created_at,
        })

    timeline.sort(key=lambda item: item["created_at"], reverse=True)
    return timeline


@router.get("/balances-summary")
def get_balances_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    balances = (
        db.query(Balance)
        .filter(
            (Balance.user_owes_id == current_user.id) |
            (Balance.user_gets_id == current_user.id)
        )
        .all()
    )

    if not balances:
        return []

    group_ids = {balance.group_id for balance in balances}
    user_ids = set()
    for balance in balances:
        user_ids.add(balance.user_owes_id)
        user_ids.add(balance.user_gets_id)

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {user.id: user for user in users}
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()
    group_map = {group.id: group.name for group in groups}

    summary = []
    for balance in balances:
        if balance.user_owes_id == current_user.id:
            counterparty_id = balance.user_gets_id
            direction = "you_owe"
        else:
            counterparty_id = balance.user_owes_id
            direction = "you_are_owed"

        counterparty = user_map.get(counterparty_id)
        summary.append({
            "group_id": balance.group_id,
            "group_name": group_map.get(balance.group_id, "Group"),
            "amount": round(balance.amount, 2),
            "direction": direction,
            "counterparty_id": counterparty_id,
            "counterparty_name": counterparty.name if counterparty else f"User {counterparty_id}",
            "counterparty_email": counterparty.email if counterparty else "",
            "counterparty_upi_id": counterparty.upi_id if counterparty else None,
        })

    summary.sort(key=lambda item: (item["group_name"], item["direction"], item["counterparty_name"]))
    return summary
