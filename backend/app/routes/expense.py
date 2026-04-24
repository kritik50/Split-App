from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from app.schemas.expense import ExpenseCreate
from app.dependencies.auth import get_current_user
from app.services.expense_service import ExpenseService


router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("/")
def create_expense(
    data: ExpenseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return ExpenseService.create_expense(db, data, current_user.id, background_tasks)


@router.get("/group/{group_id}")
def get_group_expenses(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return ExpenseService.get_group_expenses(db, group_id, current_user.id)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return ExpenseService.delete_expense(db, expense_id, current_user.id)
