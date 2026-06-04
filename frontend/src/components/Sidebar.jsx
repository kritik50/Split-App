import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Save,
  Settings,
  X,
} from "lucide-react";

import { updateProfile } from "../api/userApi";
import { AuthContext } from "../context/AuthContext.js";
import { SidebarContext } from "../context/SidebarContext.js";
import "./Sidebar.css";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const formatAmount = (value) =>
  `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const timeAgo = (iso) => {
  if (!iso) return "";

  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const SidebarItem = ({ icon, label, to, onClick, active, badge }) => {
  const navigate = useNavigate();
  const { closeMobile } = useContext(SidebarContext);
  const IconComponent = icon;

  const handleClick = () => {
    if (to) {
      navigate(to);
      closeMobile();
      return;
    }

    if (onClick) onClick();
  };

  return (
    <button
      className={`sb-item ${active ? "sb-item--active" : ""}`}
      onClick={handleClick}
      data-tooltip={label}
    >
      <span className="sb-item__icon">
        <IconComponent size={17} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="sb-item__label">{label}</span>
      {badge != null && badge > 0 && <span className="sb-item__badge">{badge}</span>}
    </button>
  );
};

const GroupItem = ({ group, active }) => {
  const navigate = useNavigate();
  const { closeMobile } = useContext(SidebarContext);

  return (
    <button
      className={`sb-group-item ${active ? "sb-group-item--active" : ""}`}
      onClick={() => {
        navigate(`/group/${group.id}`);
        closeMobile();
      }}
      data-tooltip={group.name}
    >
      <span className="sb-group-avatar">{getInitials(group.name)}</span>
      <span className="sb-group-name">{group.name}</span>
    </button>
  );
};

const ActivityItem = ({ item }) => (
  <div className="sb-activity-item">
    <span className={`sb-activity-dot sb-activity-dot--${item.type}`} />
    <div className="sb-activity-body">
      <div className="sb-activity-label">
        {item.type === "expense"
          ? `${item.actor} added "${item.label}"`
          : `${item.actor} paid ${item.to}`}
      </div>
      <div className="sb-activity-meta">
        {item.group_name} · {timeAgo(item.created_at)}
      </div>
    </div>
    <span className="sb-activity-amount">{formatAmount(item.amount)}</span>
  </div>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useContext(AuthContext);
  const {
    collapsed,
    setCollapsed,
    mobileOpen,
    closeMobile,
    sidebarData,
    loading,
  } = useContext(SidebarContext);

  const [showSettings, setShowSettings] = useState(false);
  const [upiId, setUpiId] = useState(user?.upi_id || "");
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setUpiId(user?.upi_id || "");
    setDisplayName(user?.name || "");
  }, [user]);

  useEffect(() => {
    closeMobile();
  }, [closeMobile, location.pathname]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess(false);
      await updateProfile({ upi_id: upiId.trim(), name: displayName.trim() || undefined });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => { setShowSettings(false); setSaveSuccess(false); }, 1200);
    } catch (err) {
      setSaveError("Failed to save profile.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const path = location.pathname;
  const groups = sidebarData?.groups || [];
  const recent = sidebarData?.recent || [];
  const stats = sidebarData?.stats || {};

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <aside
        className={[
          "sidebar",
          collapsed ? "sidebar--collapsed" : "",
          mobileOpen ? "sidebar--mobile-open" : "",
        ].join(" ")}
      >
        <div className="sidebar__top">
          {!collapsed && (
            <button className="sidebar__brand" onClick={() => navigate("/groups")}>
              <span className="sidebar__brand-dot" />
              <span className="sidebar__brand-name">SPLIT</span>
            </button>
          )}

          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className="sidebar__body">
          <div className="sidebar__section">
            <div className="sidebar__section-label">Navigate</div>

            <SidebarItem
              icon={LayoutGrid}
              label="My Groups"
              to="/groups"
              active={path === "/groups"}
              badge={stats.total_groups || undefined}
            />

            <SidebarItem
              icon={Receipt}
              label="All Expenses"
              to="/expenses"
              active={path === "/expenses"}
              badge={stats.total_expenses || undefined}
            />

            <SidebarItem
              icon={ArrowLeftRight}
              label="Balances"
              to="/balances"
              active={path === "/balances"}
            />

            <SidebarItem
              icon={Activity}
              label="Activity"
              to="/activity"
              active={path === "/activity"}
            />

            <SidebarItem
              icon={Settings}
              label="Settings"
              onClick={() => setShowSettings(true)}
              active={showSettings}
            />
          </div>

          <div className="sidebar__section">
            <div className="sidebar__section-label">Groups</div>

            {loading && !sidebarData ? (
              <>
                <div className="skeleton" style={{ height: 34, borderRadius: "var(--r-md)", marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 34, borderRadius: "var(--r-md)", marginBottom: 4 }} />
              </>
            ) : (
              <div className="sidebar__groups">
                {groups.map((group) => (
                  <GroupItem
                    key={group.id}
                    group={group}
                    active={path === `/group/${group.id}`}
                  />
                ))}

                {groups.length === 0 && !loading && (
                  <p
                    style={{
                      fontSize: "0.76rem",
                      color: "var(--text-3)",
                      padding: "6px 10px",
                      fontStyle: "italic",
                    }}
                  >
                    No groups yet
                  </p>
                )}

                <button
                  className="sb-create-btn"
                  onClick={() => {
                    navigate("/groups?modal=new");
                    closeMobile();
                  }}
                  data-tooltip="New Group"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>New Group</span>
                </button>
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <div className="sidebar__section">
              <div className="sidebar__section-label">Recent</div>
              {recent.slice(0, 4).map((item, index) => (
                <ActivityItem key={index} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="sidebar__foot">
          <div className="sb-profile">
            <div className="sb-profile__avatar">
              {user ? getInitials(user.name) : "?"}
            </div>
            <div className="sb-profile__info">
              <div className="sb-profile__name">{user?.name || "User"}</div>
              <div className="sb-profile__email">{user?.email || ""}</div>
            </div>
            <button className="sb-logout" onClick={handleLogout} title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {showSettings &&
        createPortal(
          <div
            className="sb-settings-backdrop"
            onClick={() => setShowSettings(false)}
          >
            <div
              className="sb-settings-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sb-settings-header">
                <h3>Profile Settings</h3>
                <button
                  className="sb-settings-close"
                  onClick={() => setShowSettings(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="sb-settings-body">
                <label className="sb-settings-label">Display Name</label>
                <input
                  className="sb-settings-input"
                  type="text"
                  placeholder="Your full name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />

                <label className="sb-settings-label" style={{ marginTop: 14 }}>UPI ID (for receiving payments)</label>
                <input
                  className="sb-settings-input"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(event) => setUpiId(event.target.value)}
                />
                <p className="sb-settings-hint">
                  This ID will be shown to people who owe you money so they can pay you directly.
                </p>

                {saveError && <p className="sb-settings-error">{saveError}</p>}
                {saveSuccess && <p style={{ fontSize: "0.8rem", color: "var(--green)", fontWeight: 600 }}>Profile saved!</p>}
              </div>

              <div className="sb-settings-footer">
                <button
                  className="sb-settings-save"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : <><Save size={14} /> Save Profile</>}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const MobileTopBar = () => {
  const { mobileOpen, setMobileOpen } = useContext(SidebarContext);

  return (
    <div className="mobile-topbar">
      <button
        className="mobile-topbar__hamburger"
        onClick={() => setMobileOpen((current) => !current)}
        aria-label="Open navigation"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
      <span className="mobile-topbar__brand">SPLIT</span>
    </div>
  );
};

export default Sidebar;
