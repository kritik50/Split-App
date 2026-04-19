from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from app.models.user import User
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.expense import Expense
from app.models.settlement import Settlement
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/sidebar", tags=["Sidebar"])


# ─────────────────────────────────────────────────────────────
# GET /sidebar  — Single optimized call for all sidebar data
#
# Returns:
#   user:        { id, name, email }
#   groups:      [ { id, name, member_count, my_balance } ]
#   stats:       { total_groups, total_expenses, net_balance }
#   recent:      last 5 activity items across all groups
# ─────────────────────────────────────────────────────────────
@router.get("")
def get_sidebar_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ── 1. Groups the user is a member of ──────────────────────
    memberships = (
        db.query(GroupMember)
        .filter(GroupMember.user_id == current_user.id)
        .all()
    )
    group_ids = [m.group_id for m in memberships]

    groups_raw = (
        db.query(Group).filter(Group.id.in_(group_ids)).all()
        if group_ids else []
    )

    # Member count per group (batch, avoids N+1)
    member_counts = {}
    if group_ids:
        rows = (
            db.query(GroupMember.group_id)
            .filter(GroupMember.group_id.in_(group_ids))
            .all()
        )
        for (gid,) in rows:
            member_counts[gid] = member_counts.get(gid, 0) + 1

    groups_list = [
        {
            "id": g.id,
            "name": g.name,
            "member_count": member_counts.get(g.id, 1),
        }
        for g in groups_raw
    ]

    # ── 2. Stats ────────────────────────────────────────────────
    total_expenses_count = (
        db.query(Expense)
        .filter(Expense.group_id.in_(group_ids))
        .count()
        if group_ids else 0
    )

    # ── 3. Recent activity (last 6 items across all user groups) ──
    recent = []

    if group_ids:
        # Recent expenses
        recent_expenses = (
            db.query(Expense)
            .filter(Expense.group_id.in_(group_ids))
            .order_by(Expense.created_at.desc())
            .limit(4)
            .all()
        )

        # Recent settlements
        recent_settlements = (
            db.query(Settlement)
            .filter(Settlement.group_id.in_(group_ids))
            .order_by(Settlement.created_at.desc())
            .limit(3)
            .all()
        )

        # Build user name map (batch, avoids N+1)
        user_ids = set()
        for e in recent_expenses:
            if e.paid_by:
                user_ids.add(e.paid_by)
        for s in recent_settlements:
            user_ids.add(s.paid_by)
            user_ids.add(s.paid_to)

        user_map = {}
        if user_ids:
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            user_map = {u.id: u.name for u in users}

        # Group name map
        group_map = {g.id: g.name for g in groups_raw}

        for e in recent_expenses:
            recent.append({
                "type": "expense",
                "id": e.id,
                "group_id": e.group_id,
                "group_name": group_map.get(e.group_id, ""),
                "label": e.notes or "Expense",
                "amount": round(e.amount, 2),
                "actor": user_map.get(e.paid_by, "Someone"),
                "created_at": e.created_at.isoformat() if e.created_at else None,
            })

        for s in recent_settlements:
            recent.append({
                "type": "settlement",
                "id": s.id,
                "group_id": s.group_id,
                "group_name": group_map.get(s.group_id, ""),
                "label": "Settlement",
                "amount": round(s.amount, 2),
                "actor": user_map.get(s.paid_by, "Someone"),
                "to": user_map.get(s.paid_to, "Someone"),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            })

        # Sort by date descending, take top 6
        recent.sort(
            key=lambda x: x["created_at"] or "",
            reverse=True,
        )
        recent = recent[:6]

    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
        },
        "groups": groups_list,
        "stats": {
            "total_groups": len(groups_list),
            "total_expenses": total_expenses_count,
        },
        "recent": recent,
    }
