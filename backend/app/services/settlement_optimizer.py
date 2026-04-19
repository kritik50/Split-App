from sqlalchemy.orm import Session
from app.models.balance import Balance


def optimize_settlements(db: Session, group_id: int):
    balances = db.query(Balance).filter(
        Balance.group_id == group_id
    ).all()

    # 🧠 Step 1: Convert to net balance per user
    net = {}

    for b in balances:
        net[b.user_gets_id] = net.get(b.user_gets_id, 0) + b.amount
        net[b.user_owes_id] = net.get(b.user_owes_id, 0) - b.amount

    # 🧠 Step 2: Separate creditors and debtors
    creditors = []
    debtors = []

    for user_id, amount in net.items():
        if amount > 0:
            creditors.append([user_id, amount])
        elif amount < 0:
            debtors.append([user_id, -amount])

    # 🧠 Step 3: Greedy matching
    i, j = 0, 0
    transactions = []

    while i < len(debtors) and j < len(creditors):
        debtor_id, debt = debtors[i]
        creditor_id, credit = creditors[j]

        settle_amount = min(debt, credit)

        transactions.append({
            "from": debtor_id,
            "to": creditor_id,
            "amount": round(settle_amount, 2)
        })

        debtors[i][1] -= settle_amount
        creditors[j][1] -= settle_amount

        if debtors[i][1] == 0:
            i += 1
        if creditors[j][1] == 0:
            j += 1

    return transactions