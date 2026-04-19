from sqlalchemy.orm import Session
from app.models.balance import Balance


def update_balance(
    db: Session,
    group_id: int,
    payer_id: int,
    participant_id: int,
    amount: float
):
    """
    payer paid → participant owes payer
    """

    if payer_id == participant_id:
        return

    # Check if reverse entry exists
    reverse = db.query(Balance).filter(
        Balance.group_id == group_id,
        Balance.user_owes_id == payer_id,
        Balance.user_gets_id == participant_id
    ).first()

    if reverse:
        if reverse.amount > amount:
            reverse.amount -= amount
        elif reverse.amount < amount:
            # flip direction
            new_amount = amount - reverse.amount
            db.delete(reverse)

            new_balance = Balance(
                group_id=group_id,
                user_owes_id=participant_id,
                user_gets_id=payer_id,
                amount=new_amount
            )
            db.add(new_balance)
        else:
            db.delete(reverse)

    else:
        # normal case
        balance = db.query(Balance).filter(
            Balance.group_id == group_id,
            Balance.user_owes_id == participant_id,
            Balance.user_gets_id == payer_id
        ).first()

        if balance:
            balance.amount += amount
        else:
            new_balance = Balance(
                group_id=group_id,
                user_owes_id=participant_id,
                user_gets_id=payer_id,
                amount=amount
            )
            db.add(new_balance)

    db.commit()