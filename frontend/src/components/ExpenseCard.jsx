import "./ExpenseCard.css";

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return null; }
};

const ExpenseCard = ({ expense, getUserName }) => {
  if (!expense) return null;

  const date = formatDate(expense.created_at);

  return (
    <div className="ec">
      <div className="ec__top">
        <div className="ec__left">
          <div className="ec__title">
            {expense.description || expense.notes || "No description"}
          </div>
          <div className="ec__paid-by">
            Paid by {getUserName ? getUserName(expense.paid_by) : `User ${expense.paid_by}`}
          </div>
        </div>

        <div className="ec__amount">
          ₹{expense.amount?.toFixed(2) ?? "0.00"}
        </div>
      </div>

      {date && <div className="ec__date">{date}</div>}

      {expense.splits && expense.splits.length > 0 && (
        <div className="ec__splits">
          <div className="ec__splits-title">Split breakdown</div>
          <ul className="ec__splits-list">
            {expense.splits.map((s, i) => (
              <li key={i} className="ec__split-row">
                <span className="ec__split-name">
                  {getUserName ? getUserName(s.user_id) : `User ${s.user_id}`}
                </span>
                <span className="ec__split-amount">
                  ₹{s.amount?.toFixed(2) ?? "0.00"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExpenseCard;