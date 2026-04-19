import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, X, AlertCircle, UserPlus, ArrowRight } from "lucide-react";

import {
  getGroupMembers,
  getGroupSummary,
  getGroupBalances,
  addMemberToGroup,
} from "../api/groupApi";
import { getExpensesByGroup } from "../api/expenseApi";
import ExpenseCard from "../components/ExpenseCard";
import "./GroupDetails.css";

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const GroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [members,  setMembers]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);

  const [activeTab,  setActiveTab]  = useState("ledger");
  const [loading,    setLoading]    = useState(true);
  const [errors,     setErrors]     = useState({});

  // Modal
  const [showModal,    setShowModal]    = useState(false);
  const [email,        setEmail]        = useState("");
  const [emailError,   setEmailError]   = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const run = async (key, fn, setter) => {
      try {
        const res = await fn();
        setter(res.data || (Array.isArray(res.data) ? [] : null));
      } catch (err) {
        console.error(`${key} error:`, err);
        setErrors((p) => ({ ...p, [key]: true }));
      }
    };

    await Promise.allSettled([
      run("members",  () => getGroupMembers(id),     setMembers),
      run("summary",  () => getGroupSummary(id),     setSummary),
      run("expenses", () => getExpensesByGroup(id),  setExpenses),
      run("balances", () => getGroupBalances(id),    setBalances),
    ]);

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserName = (userId) => {
    const m = members.find((m) => m.user_id === userId);
    return m?.name || `User ${userId}`;
  };

  // ── Add member ─────────────────────────────────────────────
  const handleAddMember = async () => {
    setEmailError("");
    const trimmed = email.trim();
    if (!trimmed) { setEmailError("Email is required."); return; }
    if (!isValidEmail(trimmed)) { setEmailError("Please enter a valid email."); return; }

    const alreadyIn = members.find((m) =>
      m.email?.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyIn) {
      setEmailError(`${alreadyIn.name} is already in this group.`);
      return;
    }

    try {
      setAddingMember(true);
      await addMemberToGroup(id, trimmed);
      setEmail("");
      setShowModal(false);
      await fetchData();
    } catch (err) {
      setEmailError(
        err?.response?.data?.detail || "Failed to add member."
      );
    } finally {
      setAddingMember(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail("");
    setEmailError("");
  };

  const hasError = Object.values(errors).some(Boolean);

  // ── Loading screen ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="gd">
        <div className="gd__container">
          <div className="gd__loading">
            <div className="gd__spinner" />
            Loading group…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd">
      <div className="gd__container">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="gd__header">
          <button className="gd__back" onClick={() => navigate("/groups")}>
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <h2 className="gd__title">
            {summary?.group_name || "Group Details"}
          </h2>

          {/* spacer to keep title centered */}
          <div style={{ width: 80 }} />
        </header>

        {/* ── Error Banner ────────────────────────────────── */}
        {hasError && (
          <div className="gd__error-banner">
            <AlertCircle size={15} />
            Some data failed to load — try refreshing.
          </div>
        )}

        {/* ── Members ─────────────────────────────────────── */}
        <section className="gd__members">
          <div className="gd__members-header">
            <div className="gd__members-title">
              <Users size={13} /> Members
            </div>
            <button className="gd__add-btn" onClick={() => setShowModal(true)}>
              <UserPlus size={13} /> Add Member
            </button>
          </div>

          <div className="gd__members-list">
            {members.length === 0 ? (
              <span style={{ fontSize: "0.82rem", color: "var(--text-3)" }}>
                No members loaded
              </span>
            ) : (
              members.map((m) => (
                <div key={m.user_id} className="gd__member-chip">
                  <div className="gd__member-avatar">
                    {getInitials(m.name)}
                  </div>
                  {m.name}
                  {m.role === "admin" && (
                    <span className="gd__member-role">Admin</span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────── */}
        {summary && (
          <div className="gd__stats">
            <div className="gd__stat">
              <div className="gd__stat-value">₹{summary.total_owed ?? 0}</div>
              <div className="gd__stat-label">Total Owed</div>
            </div>
            <div className="gd__stat">
              <div className="gd__stat-value">{summary.total_transactions ?? 0}</div>
              <div className="gd__stat-label">Expenses</div>
            </div>
            <div className="gd__stat">
              <div className="gd__stat-value">{summary.total_members ?? members.length}</div>
              <div className="gd__stat-label">Members</div>
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="gd__actions">
          <button
            className="gd__btn-primary"
            onClick={() => navigate(`/group/${id}/add-expense`)}
          >
            + Add Expense
          </button>
          <button
            className="gd__btn-secondary"
            onClick={() => setActiveTab("balances")}
          >
            Settle Up
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="gd__tabs">
          <div className={`gd__tab-slider ${activeTab === "balances" ? "gd__tab-slider--right" : ""}`} />
          <button
            className={`gd__tab-btn ${activeTab === "ledger" ? "gd__tab-btn--active" : ""}`}
            onClick={() => setActiveTab("ledger")}
          >
            Ledger
          </button>
          <button
            className={`gd__tab-btn ${activeTab === "balances" ? "gd__tab-btn--active" : ""}`}
            onClick={() => setActiveTab("balances")}
          >
            Balances
          </button>
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        <div className="gd__content">

          {/* LEDGER */}
          {activeTab === "ledger" && (
            <>
              <div className="gd__section-title">Expenses</div>

              {errors.expenses ? (
                <div className="gd__empty gd__empty--error">
                  <span className="gd__empty-icon">⚠️</span>
                  <p>Failed to load expenses</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon">💸</span>
                  <h4>No expenses yet</h4>
                  <p>Add the first expense to start tracking</p>
                  <button
                    className="gd__btn-primary"
                    style={{ width: "auto", padding: "11px 24px" }}
                    onClick={() => navigate(`/group/${id}/add-expense`)}
                  >
                    Add Expense
                  </button>
                </div>
              ) : (
                expenses.map((exp) => (
                  <ExpenseCard key={exp.id} expense={exp} getUserName={getUserName} />
                ))
              )}
            </>
          )}

          {/* BALANCES */}
          {activeTab === "balances" && (
            <>
              <div className="gd__section-title">Who owes whom</div>

              {errors.balances ? (
                <div className="gd__empty gd__empty--error">
                  <p>Failed to load balances</p>
                </div>
              ) : balances.length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon">✅</span>
                  <h4>All settled up!</h4>
                  <p>No outstanding balances in this group</p>
                </div>
              ) : (
                balances.map((b, i) => (
                  <div key={i} className="gd__settlement">
                    <div className="gd__settlement-text">
                      <strong>{b.from_user_name}</strong>
                      <span className="gd__settlement-arrow">→</span>
                      <strong>{b.to_user_name}</strong>
                    </div>
                    <div className="gd__settlement-amount">₹{b.amount}</div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Member Modal ─────────────────────────────── */}
      {showModal && (
        <div className="gd__overlay" onClick={closeModal}>
          <div className="gd__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gd__modal-header">
              <h3>Add Member</h3>
              <button className="gd__modal-close" onClick={closeModal}>
                <X size={15} />
              </button>
            </div>

            <p className="gd__modal-hint">
              Enter the email address of the person you want to add.
              They must already have an account.
            </p>

            <input
              type="email"
              className={`gd__modal-input ${emailError ? "gd__modal-input--error" : ""}`}
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              autoFocus
            />

            {emailError && (
              <div className="gd__modal-error">
                <AlertCircle size={13} /> {emailError}
              </div>
            )}

            <div className="gd__modal-actions">
              <button className="gd__btn-secondary" onClick={closeModal}
                style={{ flex: 1, padding: "11px" }}>
                Cancel
              </button>
              <button
                className="gd__btn-primary"
                style={{ flex: 1.5, padding: "11px" }}
                onClick={handleAddMember}
                disabled={addingMember || !email.trim()}
              >
                {addingMember ? "Adding…" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetails;