import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, X, AlertCircle, UserPlus, BarChart3,
  Download, CreditCard, UserMinus, LogOut
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import {
  getGroupMembers,
  getGroupSummary,
  getGroupBalances,
  addMemberToGroup,
  removeMemberFromGroup,
  exportGroupCsv,
} from "../api/groupApi";
import { getExpensesByGroup, deleteExpense } from "../api/expenseApi";
import { createSettlement, getOptimizedSettlements } from "../api/settlementApi";
import ExpenseCard from "../components/ExpenseCard";
import ConfirmModal from "../components/ConfirmModal";
import { SidebarContext } from "../context/SidebarContext.js";
import { AuthContext } from "../context/AuthContext.js";
import { useToast } from "../context/ToastContext.jsx";
import AddExpenseInline from "./AddExpenseInline";
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
  const { refresh } = useContext(SidebarContext);
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [optimizedSettlements, setOptimizedSettlements] = useState([]);

  const [activeTab, setActiveTab] = useState("ledger");
  const [simplifiedDebts, setSimplifiedDebts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Add member
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Remove member / leave
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Settlement
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settling, setSettling] = useState(false);

  // Edit/delete expense
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  // isAdmin
  const isAdmin = useMemo(
    () => members.find((m) => m.user_id === user?.id)?.role === "admin",
    [members, user]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const run = async (key, fn, setter, fallback = null) => {
      try {
        const res = await fn();
        setter(res.data ?? fallback);
      } catch (err) {
        console.error(`${key} error:`, err);
        setter(fallback);
        setErrors((prev) => ({ ...prev, [key]: true }));
      }
    };

    await Promise.allSettled([
      run("members",   () => getGroupMembers(id),          setMembers,              []),
      run("summary",   () => getGroupSummary(id),           setSummary,              null),
      run("expenses",  () => getExpensesByGroup(id),        setExpenses,             []),
      run("balances",  () => getGroupBalances(id),          setBalances,             []),
      run("optimized", () => getOptimizedSettlements(id),   setOptimizedSettlements, []),
    ]);

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUserName = (userId) => {
    const member = members.find((item) => item.user_id === userId);
    return member?.name || `User ${userId}`;
  };

  const monthlyData = useMemo(() => {
    if (!expenses.length) return [];
    const map = {};
    expenses.forEach((exp) => {
      if (!exp.created_at) return;
      const month = new Date(exp.created_at).toLocaleString("default", { month: "short" });
      map[month] = (map[month] || 0) + exp.amount;
    });
    return Object.keys(map).map((month) => ({ name: month, amount: map[month] }));
  }, [expenses]);

  /* ── Settlement helpers ─────────────────────────────────────────── */
  const openSettlementModal = (balance) => {
    setSelectedBalance(balance);
    setSettlementAmount(String(balance.amount));
    setShowSettlementModal(true);
  };

  const closeSettlementModal = () => {
    setShowSettlementModal(false);
    setSelectedBalance(null);
    setSettlementAmount("");
    setErrors((prev) => { const n = { ...prev }; delete n.settlementMessage; return n; });
  };

  const handleSettlement = async () => {
    const amount = Number(settlementAmount);
    if (!selectedBalance || !amount || amount <= 0) return;
    if (amount > Number(selectedBalance.amount)) return;
    try {
      setSettling(true);
      await createSettlement({
        group_id: Number(id),
        paid_to: selectedBalance.to_user_id ?? selectedBalance.to_id,
        amount,
      });
      closeSettlementModal();
      await refresh();
      await fetchData();
      toast.success("Payment marked as settled!");
    } catch (err) {
      const message = err?.response?.data?.detail || "Failed to settle this balance.";
      setErrors((prev) => ({ ...prev, settlementMessage: message }));
    } finally {
      setSettling(false);
    }
  };

  /* ── Add member ─────────────────────────────────────────────────── */
  const closeAddMemberModal = () => {
    setShowAddMemberModal(false);
    setEmail("");
    setEmailError("");
  };

  const handleAddMember = async () => {
    setEmailError("");
    const trimmed = email.trim();
    if (!trimmed) { setEmailError("Email is required."); return; }
    if (!isValidEmail(trimmed)) { setEmailError("Please enter a valid email."); return; }

    const alreadyIn = members.find((m) => m.email?.toLowerCase() === trimmed.toLowerCase());
    if (alreadyIn) { setEmailError(`${alreadyIn.name} is already in this group.`); return; }

    try {
      setAddingMember(true);
      await addMemberToGroup(id, trimmed);
      closeAddMemberModal();
      await refresh();
      await fetchData();
      toast.success("Member added successfully!");
    } catch (err) {
      setEmailError(err?.response?.data?.detail || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  /* ── Remove / Leave group ───────────────────────────────────────── */
  const handleRemoveMember = async () => {
    if (!confirmRemoveMember) return;
    try {
      setRemovingMember(true);
      await removeMemberFromGroup(id, confirmRemoveMember.user_id);
      const isSelf = confirmRemoveMember.user_id === user?.id;
      await refresh();
      if (isSelf) {
        toast.success("You have left the group.");
        navigate("/groups", { replace: true });
      } else {
        await fetchData();
        toast.success(`${confirmRemoveMember.name} removed from group.`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not remove member.");
    } finally {
      setRemovingMember(false);
      setConfirmRemoveMember(null);
    }
  };

  /* ── Delete expense ─────────────────────────────────────────────── */
  const handleDeleteExpense = async () => {
    if (!confirmDeleteExpense) return;
    try {
      setDeletingExpense(true);
      await deleteExpense(confirmDeleteExpense.id);
      await fetchData();
      await refresh();
      toast.success("Expense deleted.");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete expense.");
    } finally {
      setDeletingExpense(false);
      setConfirmDeleteExpense(null);
    }
  };

  /* ── Export ─────────────────────────────────────────────────────── */
  const handleExport = async () => {
    try {
      const res = await exportGroupCsv(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `group_${id}_expenses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV exported!");
    } catch (err) {
      toast.error("Export failed. Please try again.");
    }
  };

  const getUPILink = (upiId, amount, name, note) => {
    if (!upiId) return null;
    const cleanAmount = Number(amount).toFixed(2);
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${cleanAmount}&tn=${encodeURIComponent(note || "Settlement via Split")}&cu=INR`;
  };

  const hasError = ["members", "summary", "expenses", "balances"].some((key) => errors[key]);
  const handleBack = () => {
    if (window.history.length > 1) { navigate(-1); return; }
    navigate("/groups", { replace: true });
  };

  const currentUserMember = members.find((m) => m.user_id === user?.id);

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

  /* ── Balance card render helper ─────────────────────────────────── */
  const renderBalanceCard = (balance, index, isSimplified) => {
    let youOwe, youAreOwed, fromName, toName, amount, toUpiId, toUserId;

    if (isSimplified) {
      youOwe       = balance.from_id === user?.id;
      youAreOwed   = balance.to_id === user?.id;
      fromName     = balance.from;
      toName       = balance.to;
      amount       = balance.amount;
      toUpiId      = balance.to_upi_id;
      toUserId     = balance.to_id;
    } else {
      youOwe       = balance.from_user_id === user?.id;
      youAreOwed   = balance.to_user_id === user?.id;
      fromName     = balance.from_user_name;
      toName       = balance.to_user_name;
      amount       = balance.amount;
      toUpiId      = balance.to_user_upi_id;
      toUserId     = balance.to_user_id;
    }

    const settleBalance = isSimplified
      ? { to_user_id: toUserId, to_user_name: toName, amount }
      : balance;

    return (
      <div
        key={isSimplified
          ? `opt-${fromName}-${toName}-${index}`
          : `bal-${balance.from_user_id}-${balance.to_user_id}-${index}`}
        className="gd__settlement"
      >
        <div className="gd__settlement-body">
          <div className="gd__settlement-text">
            {youOwe ? (
              <><strong>You</strong><span className="gd__settlement-arrow">{"→"}</span><strong>{toName}</strong></>
            ) : youAreOwed ? (
              <><strong>{fromName}</strong><span className="gd__settlement-arrow">{"→"}</span><strong>You</strong></>
            ) : (
              <><strong>{fromName}</strong><span className="gd__settlement-arrow">{"→"}</span><strong>{toName}</strong></>
            )}
          </div>
          <div className="gd__settlement-caption">
            {youOwe
              ? "You owe this amount."
              : youAreOwed
                ? "This person owes you."
                : "Group balance"}
          </div>
        </div>

        <div className="gd__settlement-side">
          <div className="gd__settlement-amount">₹{amount}</div>
          <div className="gd__settlement-actions">
            {youOwe && (
              <>
                {toUpiId && (
                  <a
                    href={getUPILink(toUpiId, amount, toName, `Settling in ${summary?.group_name}`)}
                    className="gd__upi-btn"
                    title={`Pay ${toName} via UPI`}
                  >
                    <CreditCard size={13} />
                    <span>UPI Pay</span>
                  </a>
                )}
                <button
                  className="gd__settle-btn"
                  onClick={() => openSettlementModal(settleBalance)}
                >
                  Mark settled
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gd">
      <div className="gd__container">
        <header className="gd__header">
          <button className="gd__back" onClick={handleBack}>
            <ArrowLeft size={15} /><span>Back</span>
          </button>

          <h2 className="gd__title">{summary?.group_name || "Group Details"}</h2>

          <button className="gd__export-btn" onClick={handleExport} title="Export Expenses to CSV">
            <Download size={15} /><span>Export</span>
          </button>
        </header>

        {hasError && (
          <div className="gd__error-banner">
            <AlertCircle size={15} />
            Some data failed to load. Try refreshing.
          </div>
        )}

        {/* Members */}
        <section className="gd__members">
          <div className="gd__members-header">
            <div className="gd__members-title">
              <Users size={13} /> Members
            </div>
            {isAdmin && (
              <button className="gd__add-btn" onClick={() => setShowAddMemberModal(true)}>
                <UserPlus size={13} /> Add Member
              </button>
            )}
          </div>

          <div className="gd__members-list">
            {members.length === 0 ? (
              <span className="gd__hint">No members loaded</span>
            ) : (
              members.map((member) => (
                <div key={member.user_id} className="gd__member-chip">
                  <div className="gd__member-avatar">{getInitials(member.name)}</div>
                  {member.name}
                  {member.role === "admin" && (
                    <span className="gd__member-role">Admin</span>
                  )}
                  {/* Remove button — admin can remove others; anyone can leave themselves */}
                  {(isAdmin && member.user_id !== user?.id) || member.user_id === user?.id ? (
                    <button
                      className="gd__member-remove"
                      onClick={() => setConfirmRemoveMember(member)}
                      title={member.user_id === user?.id ? "Leave group" : `Remove ${member.name}`}
                    >
                      {member.user_id === user?.id ? <LogOut size={11} /> : <UserMinus size={11} />}
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Stats */}
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

        {/* Tabs */}
        <div className="gd__tabs">
          <div className={`gd__tab-slider ${activeTab === "balances" ? "gd__tab-slider--center" : activeTab === "insights" ? "gd__tab-slider--right" : ""}`} />
          {["ledger", "balances", "insights"].map((tab) => (
            <button
              key={tab}
              className={`gd__tab-btn ${activeTab === tab ? "gd__tab-btn--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="gd__content">

          {/* ── Ledger ────────────────────────────────────────────── */}
          {activeTab === "ledger" && (
            <>
              <div className="gd__section-title">Expenses</div>
              {errors.expenses ? (
                <div className="gd__empty gd__empty--error">
                  <span className="gd__empty-icon">!</span>
                  <p>Failed to load expenses</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon">₹</span>
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
                expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    getUserName={getUserName}
                    onDelete={(exp) => setConfirmDeleteExpense(exp)}
                    onEdit={(exp) => setEditExpense(exp)}
                  />
                ))
              )}
            </>
          )}

          {/* ── Balances ──────────────────────────────────────────── */}
          {activeTab === "balances" && (
            <>
              <div className="gd__section-title">
                Who owes whom
                <label className="gd__toggle">
                  <input
                    type="checkbox"
                    checked={simplifiedDebts}
                    onChange={(e) => setSimplifiedDebts(e.target.checked)}
                  />
                  Simplified Debts
                </label>
              </div>

              {errors.balances ? (
                <div className="gd__empty gd__empty--error">
                  <p>Failed to load balances</p>
                </div>
              ) : (simplifiedDebts ? optimizedSettlements : balances).length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon" style={{ fontSize: "1.5rem" }}>✓</span>
                  <h4>All settled up!</h4>
                  <p>No outstanding balances in this group</p>
                </div>
              ) : (
                <div className="gd__balance-list">
                  {(simplifiedDebts ? optimizedSettlements : balances).map((balance, index) =>
                    renderBalanceCard(balance, index, simplifiedDebts)
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Insights ──────────────────────────────────────────── */}
          {activeTab === "insights" && (
            <>
              <div className="gd__section-title">Expense Insights</div>
              {monthlyData.length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon"><BarChart3 size={32} /></span>
                  <h4>No data to show</h4>
                  <p>Add some expenses to see your monthly chart.</p>
                </div>
              ) : (
                <div className="gd__insights-card">
                  <div className="gd__insights-title">Monthly Spending</div>
                  <div className="gd__insights-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <XAxis dataKey="name" tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "var(--text-3)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip
                          cursor={{ fill: "var(--surface-3)" }}
                          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--text-1)" }}
                          itemStyle={{ color: "var(--brand)" }}
                          formatter={(val) => [`₹${Number(val).toFixed(2)}`, "Spent"]}
                        />
                        <Bar dataKey="amount" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Member Modal ─────────────────────────────────────────── */}
      {showAddMemberModal && (
        <div className="gd__overlay" onClick={closeAddMemberModal}>
          <div className="gd__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gd__modal-header">
              <h3>Add Member</h3>
              <button className="gd__modal-close" onClick={closeAddMemberModal}><X size={15} /></button>
            </div>
            <p className="gd__modal-hint">
              Enter the email address of the person you want to add. They must already have an account.
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
              <div className="gd__modal-error"><AlertCircle size={13} /> {emailError}</div>
            )}
            <div className="gd__modal-actions">
              <button className="gd__btn-secondary" onClick={closeAddMemberModal} style={{ flex: 1, padding: "11px" }}>Cancel</button>
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

      {/* ── Settlement Modal ─────────────────────────────────────────── */}
      {showSettlementModal && selectedBalance && (
        <div className="gd__overlay" onClick={closeSettlementModal}>
          <div className="gd__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gd__modal-header">
              <h3>Mark as settled</h3>
              <button className="gd__modal-close" onClick={closeSettlementModal}><X size={15} /></button>
            </div>
            <p className="gd__modal-hint">
              Record how much you paid to <strong>{selectedBalance.to_user_name ?? selectedBalance.to}</strong>. This will reduce the outstanding balance.
            </p>
            <input
              type="number" min="0.01" step="0.01" max={selectedBalance.amount}
              className="gd__modal-input"
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              autoFocus
            />
            {errors.settlementMessage && (
              <div className="gd__modal-error"><AlertCircle size={13} /> {errors.settlementMessage}</div>
            )}
            <div className="gd__settlement-note">
              Max: <strong>₹{selectedBalance.amount}</strong>
            </div>
            <div className="gd__modal-actions">
              <button className="gd__btn-secondary" onClick={closeSettlementModal} style={{ flex: 1, padding: "11px" }}>Cancel</button>
              <button
                className="gd__btn-primary"
                style={{ flex: 1.5, padding: "11px" }}
                onClick={handleSettlement}
                disabled={settling || !settlementAmount}
              >
                {settling ? "Saving…" : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Remove Member ────────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmRemoveMember}
        title={confirmRemoveMember?.user_id === user?.id ? "Leave group?" : `Remove ${confirmRemoveMember?.name}?`}
        message={
          confirmRemoveMember?.user_id === user?.id
            ? "You will lose access to this group. Make sure all your balances are settled first."
            : `${confirmRemoveMember?.name} will be removed. They must have no outstanding balances.`
        }
        confirmText={confirmRemoveMember?.user_id === user?.id ? "Leave Group" : "Remove Member"}
        variant="danger"
        loading={removingMember}
        onConfirm={handleRemoveMember}
        onCancel={() => setConfirmRemoveMember(null)}
      />

      {/* ── Confirm Delete Expense ───────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmDeleteExpense}
        title="Delete expense?"
        message={`"${confirmDeleteExpense?.description || confirmDeleteExpense?.notes || "This expense"}" will be permanently removed and balances will be recalculated.`}
        confirmText="Delete Expense"
        variant="danger"
        loading={deletingExpense}
        onConfirm={handleDeleteExpense}
        onCancel={() => setConfirmDeleteExpense(null)}
      />

      {/* ── Edit Expense Modal ───────────────────────────────────────── */}
      {editExpense && (
        <AddExpenseInline
          groupId={id}
          members={members}
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={async () => {
            setEditExpense(null);
            await fetchData();
            await refresh();
            toast.success("Expense updated!");
          }}
        />
      )}
    </div>
  );
};

export default GroupDetails;
