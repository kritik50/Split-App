import { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, IndianRupee, FileText, Users, Check, Wallet } from "lucide-react";

import { addExpense } from "../api/expenseApi";
import { getGroupMembers } from "../api/groupApi";
import { SidebarContext } from "../context/SidebarContext";
import { AuthContext } from "../context/AuthContext";
import "./AddExpense.css";

const SPLIT_OPTIONS = [
  { id: "equal", label: "Equal" },
  { id: "exact", label: "Exact" },
  { id: "percentage", label: "Percentage" },
];

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const AddExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useContext(SidebarContext);
  const { user } = useContext(AuthContext);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [paidBy, setPaidBy] = useState(null);
  const [splitType, setSplitType] = useState("equal");
  const [splitInputs, setSplitInputs] = useState({});
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const res = await getGroupMembers(id);
        const data = res.data || [];
        setMembers(data);
        setSelectedMembers(data.map((member) => member.user_id));

        const defaults = {};
        data.forEach((member) => {
          defaults[member.user_id] = { amount: "", percentage: "" };
        });
        setSplitInputs(defaults);

        const preferredPayer = data.find((member) => member.user_id === user?.id);
        setPaidBy(preferredPayer?.user_id || data[0]?.user_id || null);
      } catch (err) {
        console.error("Failed to fetch members:", err);
        setFormError("Could not load group members.");
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [id, user?.id]);

  const selectedMemberObjects = useMemo(
    () => members.filter((member) => selectedMembers.includes(member.user_id)),
    [members, selectedMembers]
  );

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((memberId) => memberId !== userId)
        : [...prev, userId]
    );
    setFormError("");
  };

  const updateSplitInput = (userId, field, value) => {
    setSplitInputs((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [field]: value,
      },
    }));
    setFormError("");
  };

  const totalAmount = Number(amount || 0);
  const equalPerPerson =
    totalAmount > 0 && selectedMembers.length > 0
      ? (totalAmount / selectedMembers.length).toFixed(2)
      : null;

  const exactTotal = selectedMemberObjects.reduce(
    (sum, member) => sum + Number(splitInputs[member.user_id]?.amount || 0),
    0
  );

  const percentageTotal = selectedMemberObjects.reduce(
    (sum, member) => sum + Number(splitInputs[member.user_id]?.percentage || 0),
    0
  );

  const buildSplitPayload = () => {
    if (splitType === "equal") {
      return selectedMembers.map((userId) => ({ user_id: userId }));
    }

    if (splitType === "exact") {
      return selectedMembers.map((userId) => ({
        user_id: userId,
        amount: Number(splitInputs[userId]?.amount || 0),
      }));
    }

    return selectedMembers.map((userId) => ({
      user_id: userId,
      percentage: Number(splitInputs[userId]?.percentage || 0),
    }));
  };

  const validateForm = () => {
    if (!amount || totalAmount <= 0) {
      return "Please enter a valid amount.";
    }
    if (!description.trim()) {
      return "Please enter a description.";
    }
    if (!paidBy) {
      return "Choose who paid for this expense.";
    }
    if (selectedMembers.length === 0) {
      return "Select at least one member to split with.";
    }

    if (splitType === "exact") {
      if (selectedMemberObjects.some((member) => Number(splitInputs[member.user_id]?.amount || 0) < 0)) {
        return "Exact split amounts cannot be negative.";
      }
      if (Math.abs(exactTotal - totalAmount) > 0.01) {
        return `Exact amounts must add up to ${formatMoney(totalAmount)}.`;
      }
    }

    if (splitType === "percentage") {
      if (selectedMemberObjects.some((member) => Number(splitInputs[member.user_id]?.percentage || 0) < 0)) {
        return "Percentages cannot be negative.";
      }
      if (Math.abs(percentageTotal - 100) > 0.01) {
        return "Percentages must add up to 100.";
      }
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setLoading(true);
      setFormError("");
      await addExpense({
        group_id: Number(id),
        amount: totalAmount,
        paid_by: Number(paidBy),
        split_type: splitType,
        notes: description.trim(),
        splits: buildSplitPayload(),
      });
      await refresh();
      navigate(`/group/${id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add expense.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ae">
      <div className="ae__container">
        <header className="ae__header">
          <button className="ae__back" onClick={() => navigate(`/group/${id}`)}>
            <ArrowLeft size={15} /> <span>Back</span>
          </button>

          <h2 className="ae__title">Add Expense</h2>

          <div className="ae__header-spacer" />
        </header>

        <form className="ae__form" onSubmit={handleSubmit}>
          <div className="ae__field">
            <label className="ae__label">
              <IndianRupee size={12} /> Amount
            </label>
            <div className="ae__input-wrap">
              <IndianRupee size={18} className="ae__input-icon" />
              <input
                className="ae__input ae__input--amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFormError("");
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="ae__field">
            <label className="ae__label">
              <FileText size={12} /> Description
            </label>
            <div className="ae__input-wrap">
              <FileText size={16} className="ae__input-icon" />
              <input
                className="ae__input"
                type="text"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFormError("");
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="ae__field">
            <label className="ae__label">
              <Wallet size={12} /> Paid By
            </label>

            <div className="ae__payer-list">
              {members.map((member) => (
                <button
                  key={member.user_id}
                  type="button"
                  className={`ae__payer-chip ${paidBy === member.user_id ? "ae__payer-chip--active" : ""}`}
                  onClick={() => {
                    setPaidBy(member.user_id);
                    setFormError("");
                  }}
                >
                  <span className="ae__member-avatar-sm">{getInitials(member.name)}</span>
                  <span>{member.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ae__field">
            <label className="ae__label">
              <Users size={12} /> Split Type
            </label>

            <div className="ae__split-types">
              {SPLIT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`ae__split-type-btn ${splitType === option.id ? "ae__split-type-btn--active" : ""}`}
                  onClick={() => {
                    setSplitType(option.id);
                    setFormError("");
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ae__field">
            <label className="ae__label">
              <Users size={12} /> Split With
            </label>

            {membersLoading ? (
              <div className="skeleton" style={{ height: 80, borderRadius: "var(--r-md)" }} />
            ) : (
              <div className="ae__members-list">
                {members.map((member) => {
                  const checked = selectedMembers.includes(member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      className={`ae__member-row ${checked ? "ae__member-row--checked" : ""}`}
                      onClick={() => !loading && toggleMember(member.user_id)}
                    >
                      <div className="ae__member-check">
                        <Check size={11} className="ae__member-check-icon" strokeWidth={3} />
                      </div>
                      <div className="ae__member-avatar-sm">
                        {getInitials(member.name)}
                      </div>
                      <span className="ae__member-name">{member.name}</span>

                      {member.role === "admin" && (
                        <span className="ae__member-badge">Admin</span>
                      )}

                      {checked && splitType !== "equal" && (
                        <div
                          className="ae__member-input-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            className="ae__member-input"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={splitType === "exact" ? "Amount" : "%"}
                            value={
                              splitType === "exact"
                                ? splitInputs[member.user_id]?.amount || ""
                                : splitInputs[member.user_id]?.percentage || ""
                            }
                            onChange={(e) =>
                              updateSplitInput(
                                member.user_id,
                                splitType === "exact" ? "amount" : "percentage",
                                e.target.value
                              )
                            }
                          />
                          <span className="ae__member-input-suffix">
                            {splitType === "exact" ? "Rs" : "%"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {splitType === "equal" && equalPerPerson && (
              <div className="ae__split-info">
                {formatMoney(equalPerPerson)} each · {selectedMembers.length} member
                {selectedMembers.length > 1 ? "s" : ""}
              </div>
            )}

            {splitType === "exact" && (
              <div className={`ae__split-info ${Math.abs(exactTotal - totalAmount) > 0.01 ? "ae__split-info--warning" : ""}`}>
                Assigned {formatMoney(exactTotal)} of {formatMoney(totalAmount)}
              </div>
            )}

            {splitType === "percentage" && (
              <div className={`ae__split-info ${Math.abs(percentageTotal - 100) > 0.01 ? "ae__split-info--warning" : ""}`}>
                Assigned {percentageTotal.toFixed(2)}% of 100%
              </div>
            )}
          </div>

          {formError && <p className="ae__error">{formError}</p>}

          <button
            type="submit"
            className="ae__submit"
            disabled={loading || selectedMembers.length === 0 || membersLoading}
          >
            {loading ? "Recording..." : "Record Expense"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
