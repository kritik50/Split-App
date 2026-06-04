import { useEffect, useState, useMemo } from "react";
import { Receipt, RefreshCcw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const ITEMS_PER_PAGE = 20;

const AllExpenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  useEffect(() => { fetchExpenses(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        (e.notes || "").toLowerCase().includes(q) ||
        (e.group_name || "").toLowerCase().includes(q) ||
        (e.paid_by || "").toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

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
            <RefreshCcw size={15} className={loading ? "all-expenses__spin" : ""} />
            Refresh
          </button>
        </header>

        {/* Search bar */}
        <div className="all-expenses__search-wrap">
          <Search size={15} className="all-expenses__search-icon" />
          <input
            className="all-expenses__search"
            type="text"
            placeholder="Search by description, group, or person…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button className="all-expenses__search-clear" onClick={() => handleSearchChange("")}>
              <X size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="all-expenses__loading">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton all-expenses__skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="all-expenses__state all-expenses__state--error">
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="all-expenses__state">
            <Receipt size={22} />
            <h3>{search ? "No results found" : "No expenses yet"}</h3>
            <p>{search ? `Nothing matched "${search}"` : "Your recorded expenses will appear here."}</p>
          </div>
        ) : (
          <>
            <div className="all-expenses__list">
              {paginated.map((expense) => (
                <article
                  key={expense.id}
                  className="all-expenses__card"
                  onClick={() => navigate(`/group/${expense.group_id}`)}
                  style={{ cursor: "pointer" }}
                  title="Open group"
                >
                  <div className="all-expenses__card-top">
                    <div>
                      <h3>{expense.notes || "Untitled expense"}</h3>
                      <p>
                        Paid by <strong>{expense.paid_by}</strong> in{" "}
                        <span className="all-expenses__group-name">
                          {expense.group_name || `Group #${expense.group_id}`}
                        </span>
                      </p>
                    </div>
                    <div className="all-expenses__amount">
                      ₹{Number(expense.amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="all-expenses__meta">
                    <span>{expense.group_name || `Group #${expense.group_id}`}</span>
                    <span>{formatDate(expense.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="all-expenses__pagination">
                <button
                  className="all-expenses__page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className="all-expenses__page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="all-expenses__page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="all-expenses__count">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} expense{filtered.length !== 1 ? "s" : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllExpenses;
