from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.settlement import Settlement
from app.models.user import User
from app.dependencies.auth import get_current_user
from fastapi import HTTPException


router = APIRouter(prefix="/users", tags=["Users"])


# ─────────────────────────────────────────────
# SEARCH USER BY EMAIL (for Add Member modal)
# ─────────────────────────────────────────────
@router.get("/search")
def search_user_by_email(
    email: str = Query(..., description="Email address to search for"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
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
    current_user=Depends(get_current_user)
):
    # 🔥 Fetch data
    expenses = db.query(Expense).all()
    settlements = db.query(Settlement).all()

    # 🧠 Get all user IDs
    user_ids = set()

    for e in expenses:
        user_ids.add(e.paid_by)

    for s in settlements:
        user_ids.add(s.paid_by)
        user_ids.add(s.paid_to)

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u.name for u in users}

    timeline = []

    # 🔥 Add expenses
    for e in expenses:
        timeline.append({
            "type": "expense",
            "id": e.id,
            "group_id": e.group_id,
            "paid_by": user_map.get(e.paid_by, "Unknown"),
            "amount": round(e.amount, 2),
            "notes": e.notes,
            "created_at": e.created_at
        })

    # 🔥 Add settlements
    for s in settlements:
        timeline.append({
            "type": "settlement",
            "id": s.id,
            "group_id": s.group_id,
            "paid_by": user_map.get(s.paid_by, "Unknown"),
            "paid_to": user_map.get(s.paid_to, "Unknown"),
            "amount": round(s.amount, 2),
            "created_at": s.created_at
        })

    # 🔥 Sort latest first
    timeline.sort(key=lambda x: x["created_at"], reverse=True)

    return timeline