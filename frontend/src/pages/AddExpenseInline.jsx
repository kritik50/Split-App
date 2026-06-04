/**
 * AddExpenseInline
 * A modal-based expense editor that reuses the same form logic as AddExpense.
 * Used by GroupDetails to edit an existing expense.
 */
import { useState, useEffect, useMemo } from "react";
import { X, IndianRupee, FileText, Users, Check, Wallet } from "lucide-react";
import { updateExpense } from "../api/expenseApi";
import "./AddExpenseInline.css";

const SPLIT_OPTIONS = [
  { id: "equal",      label: "Equal" },
  { id: "exact",      label: "Exact" },
  { id: "percentage", label: "Percentage" },
];

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`;

const AddExpenseInline = ({ groupId, members, expense, onClose, onSaved }) => {
  const [amount, setAmount]           = useState(String(expense?.amount || ""));
  const [description, setDescription] = useState(expense?.description || expense?.notes || "");
  const [paidBy, setPaidBy]           = useState(expense?.paid_by ?? null);
  const [splitType, setSplitType]     = useState("equal");
  const [selectedMembers, setSelectedMembers] = useState(
    expense?.splits?.map((s) => s.user_id) || members.map((m) => m.user_id)
  );
  const [splitInputs, setSplitInputs] = useState(() => {
    const defaults = {};
    members.forEach((m) => {
      const split = expense?.splits?.find((s) => s.user_id === m.user_id);
      defaults[m.user_id] = { amount: split?.amount || "", percentage: "" };
    });
    return defaults;
  });
  const [loading, setLoading]     = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selectedMemberObjects = useMemo(
    () => members.filter((m) => selectedMembers.includes(m.user_id)),
    [members, selectedMembers]
  );

  const totalAmount = Number(amount || 0);
  const equalPerPerson = totalAmount > 0 && selectedMembers.length > 0
    ? (totalAmount / selectedMembers.length).toFixed(2)
    : null;
  const exactTotal = selectedMemberObjects.reduce(
    (sum, m) => sum + Number(splitInputs[m.user_id]?.amount || 0), 0
  );
  const percentageTotal = selectedMemberObjects.reduce(
    (sum, m) => sum + Number(splitInputs[m.user_id]?.percentage || 0), 0
  );

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setFormError("");
  };

  const updateSplitInput = (userId, field, value) => {
    setSplitInputs((prev) => ({ ...prev, [userId]: { ...(prev[userId] || {}), [field]: value } }));
    setFormError("");
  };

  const buildSplitPayload = () => {
    if (splitType === "equal") return selectedMembers.map((uid) => ({ user_id: uid }));
    if (splitType === "exact") return selectedMembers.map((uid) => ({ user_id: uid, amount: Number(splitInputs[uid]?.amount || 0) }));
    return selectedMembers.map((uid) => ({ user_id: uid, percentage: Number(splitInputs[uid]?.percentage || 0) }));
  };

  const validate = () => {
    if (!amount || totalAmount <= 0) return "Please enter a valid amount.";
    if (!description.trim())         return "Please enter a description.";
    if (!paidBy)                     return "Choose who paid for this expense.";
    if (selectedMembers.length === 0) return "Select at least one member to split with.";
    if (splitType === "exact" && Math.abs(exactTotal - totalAmount) > 0.01)
      return `Exact amounts must add up to ${formatMoney(totalAmount)}.`;
    if (splitType === "percentage" && Math.abs(percentageTotal - 100) > 0.01)
      return "Percentages must add up to 100.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }
    try {
      setLoading(true);
      setFormError("");
      await updateExpense(expense.id, {
        amount: totalAmount,
        paid_by: Number(paidBy),
        split_type: splitType,
        notes: description.trim(),
        splits: buildSplitPayload(),
      });
      onSaved();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Failed to update expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aei-backdrop" onClick={onClose}>
      <div className="aei" onClick={(e) => e.stopPropagation()}>
        <div className="aei__header">
          <h3>Edit Expense</h3>
          <button className="aei__close" onClick={onClose}><X size={15} /></button>
        </div>

        <form className="aei__form" onSubmit={handleSubmit}>
          {/* Amount */}
          <div className="aei__field">
            <label className="aei__label"><IndianRupee size={12} /> Amount</label>
            <div className="aei__input-wrap">
              <IndianRupee size={16} className="aei__input-icon" />
              <input
                className="aei__input aei__input--amount"
                type="number" step="0.01" min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setFormError(""); }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="aei__field">
            <label className="aei__label"><FileText size={12} /> Description</label>
            <div className="aei__input-wrap">
              <FileText size={16} className="aei__input-icon" />
              <input
                className="aei__input"
                type="text"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => { setDescription(e.target.value); setFormError(""); }}
              />
            </div>
          </div>

          {/* Paid By */}
          <div className="aei__field">
            <label className="aei__label"><Wallet size={12} /> Paid By</label>
            <div className="aei__payer-list">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  className={`aei__payer-chip ${paidBy === m.user_id ? "aei__payer-chip--active" : ""}`}
                  onClick={() => { setPaidBy(m.user_id); setFormError(""); }}
                >
                  <span className="aei__avatar">{getInitials(m.name)}</span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Split Type */}
          <div className="aei__field">
            <label className="aei__label"><Users size={12} /> Split Type</label>
            <div className="aei__split-types">
              {SPLIT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`aei__split-btn ${splitType === opt.id ? "aei__split-btn--active" : ""}`}
                  onClick={() => { setSplitType(opt.id); setFormError(""); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split With */}
          <div className="aei__field">
            <label className="aei__label"><Users size={12} /> Split With</label>
            <div className="aei__members-list">
              {members.map((m) => {
                const checked = selectedMembers.includes(m.user_id);
                return (
                  <div
                    key={m.user_id}
                    className={`aei__member-row ${checked ? "aei__member-row--checked" : ""}`}
                    onClick={() => toggleMember(m.user_id)}
                  >
                    <div className="aei__check">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <div className="aei__avatar">{getInitials(m.name)}</div>
                    <span className="aei__member-name">{m.name}</span>
                    {checked && splitType !== "equal" && (
                      <div className="aei__member-input-wrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="aei__member-input"
                          type="number" step="0.01" min="0"
                          placeholder={splitType === "exact" ? "Amount" : "%"}
                          value={splitType === "exact"
                            ? splitInputs[m.user_id]?.amount || ""
                            : splitInputs[m.user_id]?.percentage || ""}
                          onChange={(e) => updateSplitInput(m.user_id, splitType === "exact" ? "amount" : "percentage", e.target.value)}
                        />
                        <span className="aei__member-input-suffix">
                          {splitType === "exact" ? "₹" : "%"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {splitType === "equal" && equalPerPerson && (
              <div className="aei__split-info">{formatMoney(equalPerPerson)} each · {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""}</div>
            )}
            {splitType === "exact" && (
              <div className={`aei__split-info ${Math.abs(exactTotal - totalAmount) > 0.01 ? "aei__split-info--warning" : ""}`}>
                Assigned {formatMoney(exactTotal)} of {formatMoney(totalAmount)}
              </div>
            )}
            {splitType === "percentage" && (
              <div className={`aei__split-info ${Math.abs(percentageTotal - 100) > 0.01 ? "aei__split-info--warning" : ""}`}>
                Assigned {percentageTotal.toFixed(2)}% of 100%
              </div>
            )}
          </div>

          {formError && <p className="aei__error">{formError}</p>}

          <div className="aei__footer">
            <button type="button" className="aei__cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="aei__submit" disabled={loading || selectedMembers.length === 0}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseInline;
