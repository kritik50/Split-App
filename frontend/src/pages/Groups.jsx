import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowRight, Plus, Trash2, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { createGroup, deleteGroup, getGroups } from "../api/groupApi";
import { SidebarContext } from "../context/SidebarContext.js";
import { useToast } from "../context/ToastContext.jsx";
import ConfirmModal from "../components/ConfirmModal";
import "./Groups.css";

const GROUP_CATEGORIES = [
  { id: "",        label: "No category" },
  { id: "trip",   label: "✈️ Trip" },
  { id: "home",   label: "🏠 Home" },
  { id: "food",   label: "🍕 Food" },
  { id: "work",   label: "💼 Work" },
  { id: "other",  label: "📦 Other" },
];

const CATEGORY_LABELS = {
  trip:  "✈️ Trip",
  home:  "🏠 Home",
  food:  "🍕 Food",
  work:  "💼 Work",
  other: "📦 Other",
};

const CreateGroupModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) { setError("Group name is required."); return; }
    try {
      setLoading(true);
      const res = await createGroup({ name: name.trim(), category: category || null });
      onCreated(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cgm-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cgm" onClick={(event) => event.stopPropagation()}>
        <button className="cgm__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="cgm__head">
          <div className="cgm__icon">
            <Users size={22} />
          </div>
          <h2 className="cgm__title">Create a Group</h2>
          <p className="cgm__subtitle">Give your group a name to get started</p>
        </div>

        <form className="cgm__form" onSubmit={handleSubmit}>
          <div className="cgm__field">
            <label className="cgm__label" htmlFor="cgm-name">Group Name</label>
            <input
              id="cgm-name"
              ref={inputRef}
              className="cgm__input"
              type="text"
              placeholder="e.g. Goa Trip, Flat Expenses"
              value={name}
              onChange={(event) => { setName(event.target.value); setError(""); }}
              autoComplete="off"
            />
            {error && <p className="cgm__error">{error}</p>}
          </div>

          <div className="cgm__field">
            <label className="cgm__label" htmlFor="cgm-category">Category <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span></label>
            <select
              id="cgm-category"
              className="cgm__select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {GROUP_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="cgm__actions">
            <button type="button" className="cgm__cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="cgm__submit" disabled={!name.trim() || loading}>
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // group object to delete

  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useContext(SidebarContext);
  const toast = useToast();

  const fetchGroups = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("modal") === "new") {
      setShowModal(true);
      navigate("/groups", { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    const groupId = confirmDelete.id;
    try {
      setDeletingId(groupId);
      await deleteGroup(groupId);
      setGroups((current) => current.filter((group) => group.id !== groupId));
      await refresh();
      toast.success(`"${confirmDelete.name}" deleted.`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete group.");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleGroupCreated = async (newGroup) => {
    setShowModal(false);
    setGroups((current) => [newGroup, ...current]);
    await refresh();
    toast.success(`Group "${newGroup.name}" created!`);
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

        {!loading && groups.length > 0 && (
          <div className="groups__stats">
            <div className="groups__stat">
              <div className="groups__stat-value">{groups.length}</div>
              <div className="groups__stat-label">Groups</div>
            </div>
            <div className="groups__stat">
              <div className="groups__stat-value">{groups.length > 0 ? "Active" : "-"}</div>
              <div className="groups__stat-label">Status</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="groups__loading">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton groups__skel" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="groups__empty">
            <span className="groups__empty-icon"><Users size={40} /></span>
            <h3>No groups yet</h3>
            <p>Create your first group to start splitting expenses</p>
            <button className="groups__create-btn" onClick={() => setShowModal(true)}>
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
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/group/${group.id}`);
                  }
                }}
              >
                <div className="group-card__left">
                  <div className="group-card__avatar">{getAvatar(group.name)}</div>
                  <div className="group-card__info">
                    <div className="group-card__name">{group.name}</div>
                    <div className="group-card__meta">
                      {group.category && CATEGORY_LABELS[group.category]
                        ? <span className="group-card__category">{CATEGORY_LABELS[group.category]}</span>
                        : <><span className="group-card__dot" /> Active</>
                      }
                    </div>
                  </div>
                </div>

                <div className="group-card__right">
                  <button
                    className="group-card__delete"
                    onClick={(event) => { event.stopPropagation(); setConfirmDelete(group); }}
                    disabled={deletingId === group.id}
                    aria-label={`Delete ${group.name}`}
                  >
                    {deletingId === group.id ? (
                      <span style={{ fontSize: "10px" }}>...</span>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                  <ArrowRight size={18} className="group-card__arrow" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreated={handleGroupCreated}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Group?"
        message={`"${confirmDelete?.name}" and all its expenses will be permanently deleted. This cannot be undone.`}
        confirmText="Delete Group"
        variant="danger"
        loading={!!deletingId}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Groups;
