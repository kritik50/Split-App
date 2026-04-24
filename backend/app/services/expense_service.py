import asyncio
import logging
from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from app.models.expense import Expense
from app.models.expense_split import ExpenseSplit
from app.models.group_member import GroupMember
from app.services.balance_service import update_balance
from app.schemas.expense import ExpenseCreate

logger = logging.getLogger(__name__)

async def process_async_settlement(expense_id: int, group_id: int):
    # Simulate a background job (e.g., sending emails, pushing notifications, simplifying debts)
    await asyncio.sleep(1)
    print(f"[BACKGROUND JOB] Successfully processed async settlement & notifications for Expense {expense_id} in Group {group_id}")

class ExpenseService:
    @staticmethod
    def _rounded_share(total, raw_values):
        rounded = [round(value, 2) for value in raw_values]
        diff = round(total - sum(rounded), 2)
        if rounded:
            rounded[-1] = round(rounded[-1] + diff, 2)
        return rounded

    @staticmethod
    def create_expense(db: Session, data: ExpenseCreate, current_user_id: int, background_tasks: BackgroundTasks = None) -> dict:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == data.group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Not part of this group")

        if not data.splits:
            raise HTTPException(status_code=400, detail="Splits cannot be empty")

        if data.amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")

        payer_id = data.paid_by or current_user_id

        payer_member = db.query(GroupMember).filter(
            GroupMember.group_id == data.group_id,
            GroupMember.user_id == payer_id
        ).first()

        if not payer_member:
            raise HTTPException(status_code=400, detail="Selected payer is not in this group")

        split_type = (data.split_type or "equal").lower()
        split_payloads = list(data.splits)

        if split_type == "equal":
            share_values = ExpenseService._rounded_share(
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

            share_values = ExpenseService._rounded_share(
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

        if background_tasks:
            background_tasks.add_task(process_async_settlement, expense.id, expense.group_id)

        return {"message": "Expense created successfully", "expense_id": expense.id}

    @staticmethod
    def get_group_expenses(db: Session, group_id: int, current_user_id: int) -> list[dict]:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

        expenses = (
            db.query(Expense)
            .options(joinedload(Expense.splits))
            .filter(Expense.group_id == group_id)
            .order_by(Expense.id.desc())
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
                "description": e.notes,
                "created_at": e.created_at.isoformat() if hasattr(e, 'created_at') and e.created_at else None,
                "splits": [
                    {
                        "user_id": s.user_id,
                        "amount": s.amount
                    }
                    for s in e.splits
                ]
            })

        return result

    @staticmethod
    def delete_expense(db: Session, expense_id: int, current_user_id: int) -> dict:
        expense = db.query(Expense).filter(Expense.id == expense_id).first()

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")

        member = db.query(GroupMember).filter(
            GroupMember.group_id == expense.group_id,
            GroupMember.user_id == current_user_id
        ).first()

        if not member:
            raise HTTPException(status_code=403, detail="Access denied")

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

        db.query(ExpenseSplit).filter(
            ExpenseSplit.expense_id == expense.id
        ).delete()

        db.delete(expense)
        db.commit()

        return {"message": "Expense deleted successfully"}
