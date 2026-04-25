from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.settlement_optimizer import optimize_settlements
from database import get_db
from app.models.settlement import Settlement
from app.models.group_member import GroupMember
from app.services.balance_service import update_balance
from app.schemas.settlement import SettlementCreate, SettlementResponse
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/settlements", tags=["Settlements"])


# 🔥 CREATE SETTLEMENT
@router.post("/", response_model=SettlementResponse)
def create_settlement(
    data: SettlementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # check membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == data.group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Not part of group")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # 🧠 CHECK BALANCE (IMPORTANT)
    # user should owe this person
    from app.models.balance import Balance

    balance = db.query(Balance).filter(
        Balance.group_id == data.group_id,
        Balance.user_owes_id == current_user.id,
        Balance.user_gets_id == data.paid_to
    ).first()

    if not balance or balance.amount <= 0:
        raise HTTPException(status_code=400, detail="No debt to settle")

    if data.amount > balance.amount:
        raise HTTPException(status_code=400, detail="Cannot overpay")

    # 💸 CREATE SETTLEMENT
    settlement = Settlement(
        group_id=data.group_id,
        paid_by=current_user.id,
        paid_to=data.paid_to,
        amount=data.amount
    )

    db.add(settlement)
    db.commit()
    db.refresh(settlement)

    # 🧠 UPDATE LEDGER (REVERSE FLOW)
    update_balance(
        db=db,
        group_id=data.group_id,
        payer_id=data.paid_to,
        participant_id=current_user.id,
        amount=data.amount
    )

    return settlement


# 🔥 GET GROUP SETTLEMENTS
@router.get("/group/{group_id}", response_model=list[SettlementResponse])
def get_group_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Settlement).filter(
        Settlement.group_id == group_id
    ).order_by(Settlement.created_at.desc()).all()



@router.get("/group/{group_id}/optimize")
def get_optimized_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # 🔴 Check membership
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    transactions = optimize_settlements(db, group_id)

    # 🧠 Convert IDs → names
    user_ids = set()
    for t in transactions:
        user_ids.add(t["from"])
        user_ids.add(t["to"])

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u for u in users}

    result = []
    for t in transactions:
        from_user = user_map.get(t["from"])
        to_user = user_map.get(t["to"])
        result.append({
            "from": from_user.name if from_user else "Unknown",
            "from_id": t["from"],
            "to": to_user.name if to_user else "Unknown",
            "to_id": t["to"],
            "to_upi_id": to_user.upi_id if to_user else None,
            "amount": t["amount"]
        })

    return result