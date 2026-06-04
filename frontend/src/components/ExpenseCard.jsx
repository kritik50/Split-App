import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import "./ExpenseCard.css";

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return null; }
};

const ExpenseCard = ({ expense, getUserName, onDelete, onEdit }) => {
  const [showSplits, setShowSplits] = useState(false);

  if (!expense) return null;

  const date = formatDate(expense.created_at);
  const hasSplits = expense.splits && expense.splits.length > 0;

  return (
    <div className="ec">
      <div className="ec__top">
        <div className="ec__left">
          <div className="ec__title">
            {expense.description || expense.notes || "No description"}
          </div>
          <div className="ec__paid-by">
            Paid by <strong>{getUserName ? getUserName(expense.paid_by) : `User ${expense.paid_by}`}</strong>
          </div>
        </div>

        <div className="ec__right">
          <div className="ec__amount">
            ₹{expense.amount?.toFixed(2) ?? "0.00"}
          </div>
          <div className="ec__actions">
            {onEdit && (
              <button
                className="ec__action-btn ec__action-btn--edit"
                onClick={() => onEdit(expense)}
                title="Edit expense"
              >
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button
                className="ec__action-btn ec__action-btn--delete"
                onClick={() => onDelete(expense)}
                title="Delete expense"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ec__footer">
        {date && <div className="ec__date">{date}</div>}

        {hasSplits && (
          <button
            className="ec__toggle"
            onClick={() => setShowSplits((v) => !v)}
          >
            {showSplits ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showSplits ? "Hide" : "Split details"}
          </button>
        )}
      </div>

      {showSplits && hasSplits && (
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