from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group_member import GroupMember
from app.services.balance_service import update_balance
from app.schemas.expense import ExpenseCreate
from app.dependencies.auth import get_current_user


router = APIRouter(prefix="/expenses", tags=["Expenses"])


# 🔥 CREATE EXPENSE
@router.post("/")
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    member = db.query(GroupMember).filter(
        GroupMember.group_id == data.group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Not part of this group")

    if not data.splits:
        raise HTTPException(status_code=400, detail="Splits cannot be empty")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # ✅ Create expense (backend auto-fills paid_by with current_user.id)
    expense = Expense(
        group_id=data.group_id,
        paid_by=current_user.id,
        amount=data.amount,
        notes=data.notes
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    # ✅ Calculate per-person split
    per_person = round(data.amount / len(data.splits), 2)

    for s in data.splits:
        db.add(ExpenseSplit(
            expense_id=expense.id,
            user_id=s.user_id,
            amount=per_person
        ))

        update_balance(
            db=db,
            group_id=expense.group_id,
            payer_id=current_user.id,
            participant_id=s.user_id,
            amount=per_person
        )

    db.commit()

    return {"message": "Expense created successfully", "expense_id": expense.id}


# 🔥 GET GROUP EXPENSES - FIXED TO INCLUDE created_at
@router.get("/group/{group_id}")
def get_group_expenses(
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

    expenses = (
        db.query(Expense)
        .options(joinedload(Expense.splits))
        .filter(Expense.group_id == group_id)
        .order_by(Expense.id.desc())  # ✅ Most recent first
        .all()
    )

    result = []
    for e in expenses:
        result.append({
            "id": e.id,
            "group_id": e.group_id,
            "amount": e.amount,
            "paid_by": e.paid_by,
            "description": e.notes,  # ✅ Maps notes → description for frontend
            "created_at": e.created_at.isoformat() if hasattr(e, 'created_at') and e.created_at else None,  # ✅ ADDED
            "splits": [
                {
                    "user_id": s.user_id,
                    "amount": s.amount
                }
                for s in e.splits
            ]
        })

    return result


# 🔥 DELETE EXPENSE
@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    member = db.query(GroupMember).filter(
        GroupMember.group_id == expense.group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ Reverse the balance updates
    splits = db.query(ExpenseSplit).filter(
        ExpenseSplit.expense_id == expense.id
    ).all()

    for s in splits:
        update_balance(
            db=db,
            group_id=expense.group_id,
            payer_id=s.user_id,
            participant_id=expense.paid_by,
            amount=s.amount
        )

    # ✅ Delete splits first (foreign key constraint)
    db.query(ExpenseSplit).filter(
        ExpenseSplit.expense_id == expense.id
    ).delete()

    # ✅ Delete expense
    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted successfully"}