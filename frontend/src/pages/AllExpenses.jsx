import { useEffect, useState } from "react";
import { Receipt, RefreshCcw } from "lucide-react";

import api from "../api/api";
import "./AllExpenses.css";

const formatDate = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const AllExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/users/activity");
      const items = (res.data || [])
        .filter((item) => item.type === "expense")
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );

      setExpenses(items);
    } catch (err) {
      console.error("Failed to fetch all expenses:", err);
      setError("Could not load expenses right now.");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return (
    <div className="all-expenses">
      <div className="all-expenses__container">
        <header className="all-expenses__header">
          <div>
            <h1>All Expenses</h1>
            <p>Everything you have added across your groups, in one place.</p>
          </div>

          <button
            className="all-expenses__refresh"
            onClick={fetchExpenses}
            disabled={loading}
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="all-expenses__loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton all-expenses__skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="all-expenses__state all-expenses__state--error">
            <p>{error}</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="all-expenses__state">
            <Receipt size={22} />
            <h3>No expenses yet</h3>
            <p>Your recorded expenses will appear here.</p>
          </div>
        ) : (
          <div className="all-expenses__list">
            {expenses.map((expense) => (
              <article key={expense.id} className="all-expenses__card">
                <div className="all-expenses__card-top">
                  <div>
                    <h3>{expense.notes || "Untitled expense"}</h3>
                    <p>
                      Paid by {expense.paid_by} in {expense.group_name || "Group"}
                    </p>
                  </div>
                  <div className="all-expenses__amount">
                    Rs. {Number(expense.amount || 0).toFixed(2)}
                  </div>
                </div>

                <div className="all-expenses__meta">
                  <span>Group #{expense.group_id}</span>
                  <span>{formatDate(expense.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllExpenses;
