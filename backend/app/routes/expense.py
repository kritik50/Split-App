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


def _rounded_share(total, raw_values):
    rounded = [round(value, 2) for value in raw_values]
    diff = round(total - sum(rounded), 2)
    if rounded:
      rounded[-1] = round(rounded[-1] + diff, 2)
    return rounded


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

    payer_id = data.paid_by or current_user.id

    payer_member = db.query(GroupMember).filter(
        GroupMember.group_id == data.group_id,
        GroupMember.user_id == payer_id
    ).first()

    if not payer_member:
        raise HTTPException(status_code=400, detail="Selected payer is not in this group")

    split_type = (data.split_type or "equal").lower()
    split_payloads = list(data.splits)

    if split_type == "equal":
        share_values = _rounded_share(
            data.amount,
            [data.amount / len(split_payloads)] * len(split_payloads)
        )
    elif split_type == "exact":
        if any(split.amount is None or split.amount < 0 for split in split_payloads):
            raise HTTPException(status_code=400, detail="Each selected member needs an exact amount")

        total_split = round(sum(split.amount for split in split_payloads), 2)
        if abs(total_split - round(data.amount, 2)) > 0.01:
            raise HTTPException(status_code=400, detail="Exact split amounts must add up to the total")

        share_values = [round(split.amount, 2) for split in split_payloads]
    elif split_type == "percentage":
        if any(split.percentage is None or split.percentage < 0 for split in split_payloads):
            raise HTTPException(status_code=400, detail="Each selected member needs a percentage")

        total_percentage = round(sum(split.percentage for split in split_payloads), 2)
        if abs(total_percentage - 100) > 0.01:
            raise HTTPException(status_code=400, detail="Percentages must add up to 100")

        share_values = _rounded_share(
            data.amount,
            [(data.amount * split.percentage) / 100 for split in split_payloads]
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported split type")

    expense = Expense(
        group_id=data.group_id,
        paid_by=payer_id,
        amount=data.amount,
        notes=data.notes
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    for split_data, share_amount in zip(split_payloads, share_values):
        db.add(ExpenseSplit(
            expense_id=expense.id,
            user_id=split_data.user_id,
            amount=share_amount
        ))

        update_balance(
            db=db,
            group_id=expense.group_id,
            payer_id=payer_id,
            participant_id=split_data.user_id,
            amount=share_amount
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
            "split_type": "custom" if len({round(s.amount, 2) for s in e.splits}) > 1 else "equal",
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
