import { useEffect, useState, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, X, AlertCircle, UserPlus } from "lucide-react";

import {
  getGroupMembers,
  getGroupSummary,
  getGroupBalances,
  addMemberToGroup,
} from "../api/groupApi";
import { getExpensesByGroup } from "../api/expenseApi";
import { createSettlement, getOptimizedSettlements } from "../api/settlementApi";
import ExpenseCard from "../components/ExpenseCard";
import { SidebarContext } from "../context/SidebarContext";
import { AuthContext } from "../context/AuthContext";
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

  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [optimizedSettlements, setOptimizedSettlements] = useState([]);

  const [activeTab, setActiveTab] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState("");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [settling, setSettling] = useState(false);

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
      run("members", () => getGroupMembers(id), setMembers, []),
      run("summary", () => getGroupSummary(id), setSummary, null),
      run("expenses", () => getExpensesByGroup(id), setExpenses, []),
      run("balances", () => getGroupBalances(id), setBalances, []),
      run("optimized", () => getOptimizedSettlements(id), setOptimizedSettlements, []),
    ]);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserName = (userId) => {
    const member = members.find((item) => item.user_id === userId);
    return member?.name || `User ${userId}`;
  };

  const openSettlementModal = (balance) => {
    setSelectedBalance(balance);
    setSettlementAmount(String(balance.amount));
    setShowSettlementModal(true);
  };

  const closeSettlementModal = () => {
    setShowSettlementModal(false);
    setSelectedBalance(null);
    setSettlementAmount("");
  };

  const closeAddMemberModal = () => {
    setShowAddMemberModal(false);
    setEmail("");
    setEmailError("");
  };

  const handleAddMember = async () => {
    setEmailError("");
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email.");
      return;
    }

    const alreadyIn = members.find(
      (member) => member.email?.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyIn) {
      setEmailError(`${alreadyIn.name} is already in this group.`);
      return;
    }

    try {
      setAddingMember(true);
      await addMemberToGroup(id, trimmed);
      closeAddMemberModal();
      await refresh();
      await fetchData();
    } catch (err) {
      setEmailError(err?.response?.data?.detail || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleSettlement = async () => {
    const amount = Number(settlementAmount);
    if (!selectedBalance) return;
    if (!amount || amount <= 0) {
      return;
    }
    if (amount > Number(selectedBalance.amount)) {
      return;
    }

    try {
      setSettling(true);
      await createSettlement({
        group_id: Number(id),
        paid_to: selectedBalance.to_user_id,
        amount,
      });
      closeSettlementModal();
      await refresh();
      await fetchData();
    } catch (err) {
      const message = err?.response?.data?.detail || "Failed to settle this balance.";
      setErrors((prev) => ({ ...prev, settlementMessage: message }));
    } finally {
      setSettling(false);
    }
  };

  const hasError = ["members", "summary", "expenses", "balances"].some((key) => errors[key]);

  if (loading) {
    return (
      <div className="gd">
        <div className="gd__container">
          <div className="gd__loading">
            <div className="gd__spinner" />
            Loading group...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gd">
      <div className="gd__container">
        <header className="gd__header">
          <button className="gd__back" onClick={() => navigate("/groups")}>
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <h2 className="gd__title">{summary?.group_name || "Group Details"}</h2>
          <div style={{ width: 80 }} />
        </header>

        {hasError && (
          <div className="gd__error-banner">
            <AlertCircle size={15} />
            Some data failed to load. Try refreshing.
          </div>
        )}

        <section className="gd__members">
          <div className="gd__members-header">
            <div className="gd__members-title">
              <Users size={13} /> Members
            </div>
            <button className="gd__add-btn" onClick={() => setShowAddMemberModal(true)}>
              <UserPlus size={13} /> Add Member
            </button>
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
                </div>
              ))
            )}
          </div>
        </section>

        {summary && (
          <div className="gd__stats">
            <div className="gd__stat">
              <div className="gd__stat-value">Rs{summary.total_owed ?? 0}</div>
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

        <div className="gd__content">
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
                  <span className="gd__empty-icon">Rs</span>
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
                  <ExpenseCard key={expense.id} expense={expense} getUserName={getUserName} />
                ))
              )}
            </>
          )}

          {activeTab === "balances" && (
            <>
              <div className="gd__section-title">Who owes whom</div>

              {errors.balances ? (
                <div className="gd__empty gd__empty--error">
                  <p>Failed to load balances</p>
                </div>
              ) : balances.length === 0 ? (
                <div className="gd__empty">
                  <span className="gd__empty-icon">OK</span>
                  <h4>All settled up!</h4>
                  <p>No outstanding balances in this group</p>
                </div>
              ) : (
                <div className="gd__balance-list">
                  {balances.map((balance, index) => {
                    const youOwe = balance.from_user_id === user?.id;
                    const youAreOwed = balance.to_user_id === user?.id;

                    return (
                      <div key={`${balance.from_user_id}-${balance.to_user_id}-${index}`} className="gd__settlement">
                        <div className="gd__settlement-body">
                          <div className="gd__settlement-text">
                            {youOwe ? (
                              <>
                                <strong>You</strong>
                                <span className="gd__settlement-arrow">{"->"}</span>
                                <strong>{balance.to_user_name}</strong>
                              </>
                            ) : youAreOwed ? (
                              <>
                                <strong>{balance.from_user_name}</strong>
                                <span className="gd__settlement-arrow">{"->"}</span>
                                <strong>You</strong>
                              </>
                            ) : (
                              <>
                                <strong>{balance.from_user_name}</strong>
                                <span className="gd__settlement-arrow">{"->"}</span>
                                <strong>{balance.to_user_name}</strong>
                              </>
                            )}
                          </div>

                          <div className="gd__settlement-caption">
                            {youOwe
                              ? "You can mark this as settled once you pay."
                              : youAreOwed
                                ? "This person owes you."
                                : "Group balance"}
                          </div>
                        </div>

                        <div className="gd__settlement-side">
                          <div className="gd__settlement-amount">Rs{balance.amount}</div>
                          {youOwe && (
                            <button
                              className="gd__settle-btn"
                              onClick={() => openSettlementModal(balance)}
                            >
                              Mark settled
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {optimizedSettlements.length > 0 && (
                <>
                  <div className="gd__section-title gd__section-title--spaced">Suggested settlements</div>
                  <div className="gd__suggestions">
                    {optimizedSettlements.map((item, index) => (
                      <div key={`${item.from}-${item.to}-${index}`} className="gd__suggestion-card">
                        <span>
                          <strong>{item.from}</strong> pays <strong>{item.to}</strong>
                        </span>
                        <span>Rs{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showAddMemberModal && (
        <div className="gd__overlay" onClick={closeAddMemberModal}>
          <div className="gd__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gd__modal-header">
              <h3>Add Member</h3>
              <button className="gd__modal-close" onClick={closeAddMemberModal}>
                <X size={15} />
              </button>
            </div>

            <p className="gd__modal-hint">
              Enter the email address of the person you want to add. They must already have an account.
            </p>

            <input
              type="email"
              className={`gd__modal-input ${emailError ? "gd__modal-input--error" : ""}`}
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              autoFocus
            />

            {emailError && (
              <div className="gd__modal-error">
                <AlertCircle size={13} /> {emailError}
              </div>
            )}

            <div className="gd__modal-actions">
              <button className="gd__btn-secondary" onClick={closeAddMemberModal} style={{ flex: 1, padding: "11px" }}>
                Cancel
              </button>
              <button
                className="gd__btn-primary"
                style={{ flex: 1.5, padding: "11px" }}
                onClick={handleAddMember}
                disabled={addingMember || !email.trim()}
              >
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettlementModal && selectedBalance && (
        <div className="gd__overlay" onClick={closeSettlementModal}>
          <div className="gd__modal" onClick={(e) => e.stopPropagation()}>
            <div className="gd__modal-header">
              <h3>Mark as settled</h3>
              <button className="gd__modal-close" onClick={closeSettlementModal}>
                <X size={15} />
              </button>
            </div>

            <p className="gd__modal-hint">
              Record how much you paid to <strong>{selectedBalance.to_user_name}</strong>. This will reduce the outstanding balance for this group.
            </p>

            <input
              type="number"
              min="0.01"
              step="0.01"
              max={selectedBalance.amount}
              className="gd__modal-input"
              value={settlementAmount}
              onChange={(e) => setSettlementAmount(e.target.value)}
              autoFocus
            />

            {errors.settlementMessage && (
              <div className="gd__modal-error">
                <AlertCircle size={13} /> {errors.settlementMessage}
              </div>
            )}

            <div className="gd__settlement-note">
              Max you can settle now: <strong>Rs{selectedBalance.amount}</strong>
            </div>

            <div className="gd__modal-actions">
              <button className="gd__btn-secondary" onClick={closeSettlementModal} style={{ flex: 1, padding: "11px" }}>
                Cancel
              </button>
              <button
                className="gd__btn-primary"
                style={{ flex: 1.5, padding: "11px" }}
                onClick={handleSettlement}
                disabled={settling || !settlementAmount}
              >
                {settling ? "Saving..." : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetails;
