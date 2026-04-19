import { useState, useEffect, useRef } from "react";
import { Plus, ArrowRight, Trash2, X, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { getGroups, deleteGroup, createGroup } from "../api/groupApi";
import "./Groups.css";

/* ─────────────────────────────────────────────────────────────── */
/*  Create Group Modal                                             */
/* ─────────────────────────────────────────────────────────────── */
const CreateGroupModal = ({ onClose, onCreated }) => {
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const inputRef = useRef(null);

  // trap focus & auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Group name is required."); return; }
    try {
      setLoading(true);
      const res = await createGroup({ name: name.trim() });
      onCreated(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div className="cgm-backdrop" onClick={onClose} role="dialog" aria-modal="true">

      {/* Modal panel — stop propagation so clicks inside don't close */}
      <div
        className="cgm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="cgm__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="cgm__head">
          <div className="cgm__icon">
            <Users size={22} />
          </div>
          <h2 className="cgm__title">Create a Group</h2>
          <p className="cgm__subtitle">Give your group a name to get started</p>
        </div>

        {/* Form */}
        <form className="cgm__form" onSubmit={handleSubmit}>
          <div className="cgm__field">
            <label className="cgm__label" htmlFor="cgm-name">Group Name</label>
            <input
              id="cgm-name"
              ref={inputRef}
              className="cgm__input"
              type="text"
              placeholder="e.g. Goa Trip, Flat Expenses…"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoComplete="off"
            />
            {error && <p className="cgm__error">{error}</p>}
          </div>

          <div className="cgm__actions">
            <button
              type="button"
              className="cgm__cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cgm__submit"
              disabled={!name.trim() || loading}
            >
              {loading ? "Creating…" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────── */
/*  Groups Page                                                    */
/* ─────────────────────────────────────────────────────────────── */
const Groups = () => {
  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal]   = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Open modal when sidebar navigates to /groups?modal=new
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("modal") === "new") {
      setShowModal(true);
      // Clean up URL without triggering a re-render loop
      navigate("/groups", { replace: true });
    }
  }, [location.search]);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await getGroups();
      setGroups(res.data || []);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, groupId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this group? This cannot be undone.")) return;
    try {
      setDeletingId(groupId);
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.detail || "Failed to delete group.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setShowModal(false);
    setGroups((prev) => [newGroup, ...prev]);
  };

  const getAvatar = (name) => {
    if (!name) return "?";
    const words = name.trim().split(/\s+/);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="groups">
      <div className="groups__container">

        {/* ── Header ────────────────────────────────────── */}
        <header className="groups__header">
          <div className="groups__header-left">
            <h1>My Groups</h1>
            <p>Manage your shared expenses and balances</p>
          </div>

          <div className="groups__header-actions">
            <button
              id="new-group-btn"
              className="groups__create-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              New Group
            </button>
          </div>
        </header>

        {/* ── Stats ─────────────────────────────────────── */}
        {!loading && groups.length > 0 && (
          <div className="groups__stats">
            <div className="groups__stat">
              <div className="groups__stat-value">{groups.length}</div>
              <div className="groups__stat-label">Groups</div>
            </div>
            <div className="groups__stat">
              <div className="groups__stat-value">
                {groups.length > 0 ? "Active" : "—"}
              </div>
              <div className="groups__stat-label">Status</div>
            </div>
          </div>
        )}

        {/* ── Content ───────────────────────────────────── */}
        {loading ? (
          <div className="groups__loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton groups__skel" />
            ))}
          </div>

        ) : groups.length === 0 ? (
          <div className="groups__empty">
            <span className="groups__empty-icon">👥</span>
            <h3>No groups yet</h3>
            <p>Create your first group to start splitting expenses</p>
            <button
              className="groups__create-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} /> Create your first group
            </button>
          </div>

        ) : (
          <div className="groups__grid">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => navigate(`/group/${group.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && navigate(`/group/${group.id}`)
                }
              >
                <div className="group-card__left">
                  <div className="group-card__avatar">
                    {getAvatar(group.name)}
                  </div>
                  <div className="group-card__info">
                    <div className="group-card__name">{group.name}</div>
                    <div className="group-card__meta">
                      <span className="group-card__dot" />
                      Active
                    </div>
                  </div>
                </div>

                <div className="group-card__right">
                  <button
                    className="group-card__delete"
                    onClick={(e) => handleDelete(e, group.id)}
                    disabled={deletingId === group.id}
                    aria-label={`Delete ${group.name}`}
                  >
                    {deletingId === group.id
                      ? <span style={{ fontSize: "10px" }}>…</span>
                      : <Trash2 size={14} />
                    }
                  </button>
                  <ArrowRight size={18} className="group-card__arrow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Group Modal ─────────────────────────── */}
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
};

export default Groups;