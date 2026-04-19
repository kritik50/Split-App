import { useState } from "react";
import { createGroup } from "../api/groupApi";
import { useNavigate } from "react-router-dom";
import "./CreateGroup.css";

const CreateGroup = () => {
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Group name is required."); return; }

    try {
      setLoading(true);
      await createGroup({ name: name.trim() });
      navigate("/groups");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cg">
      <div className="cg__container">
        <div className="cg__head">
          <div className="cg__icon">👥</div>
          <h2>Create a Group</h2>
          <p>Give your group a name to get started</p>
        </div>

        <form className="cg__form" onSubmit={handleSubmit}>
          <div className="cg__field">
            <label className="cg__label" htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              className="cg__input"
              type="text"
              placeholder="e.g. Goa Trip, Flat Expenses…"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
            />
            {error && (
              <p style={{
                fontSize: "0.8rem", color: "var(--red)",
                marginTop: 8, fontWeight: 500,
              }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="cg__submit"
            disabled={!name.trim() || loading}
          >
            {loading ? "Creating…" : "Create Group"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;