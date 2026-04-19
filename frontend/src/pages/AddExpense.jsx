import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, IndianRupee, FileText, Users, Check } from "lucide-react";
import { addExpense } from "../api/expenseApi";
import { getGroupMembers } from "../api/groupApi";
import "./AddExpense.css";

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const AddExpense = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [amount,          setAmount]          = useState("");
  const [description,     setDescription]     = useState("");
  const [members,         setMembers]         = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [membersLoading,  setMembersLoading]  = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setMembersLoading(true);
        const res = await getGroupMembers(id);
        const data = res.data || [];
        setMembers(data);
        setSelectedMembers(data.map((m) => m.user_id));
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [id]);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description.");
      return;
    }
    if (selectedMembers.length === 0) {
      alert("Select at least one member to split with.");
      return;
    }

    try {
      setLoading(true);
      await addExpense({
        group_id: Number(id),
        amount:   Number(amount),
        notes:    description.trim(),
        splits:   selectedMembers.map((userId) => ({ user_id: userId })),
      });
      navigate(`/group/${id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add expense.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const perPerson =
    amount && selectedMembers.length > 0
      ? (Number(amount) / selectedMembers.length).toFixed(2)
      : null;

  return (
    <div className="ae">
      <div className="ae__container">

        {/* Header */}
        <header className="ae__header">
          <button className="ae__back" onClick={() => navigate(`/group/${id}`)}>
            <ArrowLeft size={15} /> <span>Back</span>
          </button>

          <h2 className="ae__title">Add Expense</h2>

          <div className="ae__header-spacer" />
        </header>

        {/* Form */}
        <form className="ae__form" onSubmit={handleSubmit}>

          {/* Amount */}
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
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Description */}
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
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Split with */}
          <div className="ae__field">
            <label className="ae__label">
              <Users size={12} /> Split With
            </label>

            {membersLoading ? (
              <div
                className="skeleton"
                style={{ height: 80, borderRadius: "var(--r-md)" }}
              />
            ) : (
              <div className="ae__members-list">
                {members.map((m) => {
                  const checked = selectedMembers.includes(m.user_id);
                  return (
                    <div
                      key={m.user_id}
                      className={`ae__member-row ${checked ? "ae__member-row--checked" : ""}`}
                      onClick={() => !loading && toggleMember(m.user_id)}
                    >
                      <div className="ae__member-check">
                        <Check size={11} className="ae__member-check-icon" strokeWidth={3} />
                      </div>
                      <div className="ae__member-avatar-sm">
                        {getInitials(m.name)}
                      </div>
                      <span className="ae__member-name">{m.name}</span>
                      {m.role === "admin" && (
                        <span className="ae__member-badge">Admin</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {perPerson && (
              <div className="ae__split-info">
                ₹{perPerson} each · {selectedMembers.length} member
                {selectedMembers.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="ae__submit"
            disabled={loading || selectedMembers.length === 0 || membersLoading}
          >
            {loading ? "Recording…" : "Record Expense"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;