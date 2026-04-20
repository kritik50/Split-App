import { useContext, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Receipt,
  ArrowLeftRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Activity,
  X,
} from "lucide-react";

import { AuthContext }    from "../context/AuthContext";
import { SidebarContext } from "../context/SidebarContext";
import "./Sidebar.css";

// ─── Helpers ────────────────────────────────────────────────────
const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const fmtAmount = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── SidebarItem ────────────────────────────────────────────────
const SidebarItem = ({ icon: Icon, label, to, onClick, active, badge }) => {
  const navigate = useNavigate();
  const { closeMobile } = useContext(SidebarContext);

  const handleClick = () => {
    if (to) { navigate(to); closeMobile(); }
    else if (onClick) onClick();
  };

  return (
    <button
      className={`sb-item ${active ? "sb-item--active" : ""}`}
      onClick={handleClick}
      data-tooltip={label}
    >
      <span className="sb-item__icon">
        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span className="sb-item__label">{label}</span>
      {badge != null && badge > 0 && (
        <span className="sb-item__badge">{badge}</span>
      )}
    </button>
  );
};

// ─── GroupItem ──────────────────────────────────────────────────
const GroupItem = ({ group, active }) => {
  const navigate = useNavigate();
  const { closeMobile } = useContext(SidebarContext);

  return (
    <button
      className={`sb-group-item ${active ? "sb-group-item--active" : ""}`}
      onClick={() => { navigate(`/group/${group.id}`); closeMobile(); }}
      data-tooltip={group.name}
    >
      <span className="sb-group-avatar">{getInitials(group.name)}</span>
      <span className="sb-group-name">{group.name}</span>
    </button>
  );
};

// ─── ActivityItem ────────────────────────────────────────────────
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
    <span className="sb-activity-amount">{fmtAmount(item.amount)}</span>
  </div>
);

// ─── Main Sidebar ────────────────────────────────────────────────
const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout }  = useContext(AuthContext);
  const {
    collapsed, setCollapsed,
    mobileOpen, setMobileOpen, closeMobile,
    sidebarData, loading,
  } = useContext(SidebarContext);

  // Close mobile on route change
  useEffect(() => { closeMobile(); }, [location.pathname]);

  const path    = location.pathname;
  const groups  = sidebarData?.groups  || [];
  const recent  = sidebarData?.recent  || [];
  const stats   = sidebarData?.stats   || {};

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* ── Mobile Overlay ──────────────────────────────────── */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={closeMobile} />
      )}

      {/* ── Sidebar Shell ───────────────────────────────────── */}
      <aside
        className={[
          "sidebar",
          collapsed ? "sidebar--collapsed" : "",
          mobileOpen ? "sidebar--mobile-open" : "",
        ].join(" ")}
      >
        {/* ── Top: Brand + Collapse ──────────────────────── */}
        <div className="sidebar__top">
          {!collapsed && (
            <button
              className="sidebar__brand"
              onClick={() => navigate("/groups")}
            >
              <span className="sidebar__brand-dot" />
              <span className="sidebar__brand-name">SPLIT</span>
            </button>
          )}

          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed
              ? <ChevronRight size={14} />
              : <ChevronLeft  size={14} />
            }
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────── */}
        <div className="sidebar__body">

          {/* MAIN NAV */}
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
              to="/groups"
              active={false}
            />

            <SidebarItem
              icon={Activity}
              label="Activity"
              to="/groups"
              active={false}
            />
          </div>

          {/* GROUPS */}
          <div className="sidebar__section">
            <div className="sidebar__section-label">Groups</div>

            {loading && !sidebarData ? (
              <>
                <div className="skeleton" style={{ height: 34, borderRadius: "var(--r-md)", marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 34, borderRadius: "var(--r-md)", marginBottom: 4 }} />
              </>
            ) : (
              <div className="sidebar__groups">
                {groups.map((g) => (
                  <GroupItem
                    key={g.id}
                    group={g}
                    active={path === `/group/${g.id}`}
                  />
                ))}

                {groups.length === 0 && !loading && (
                  <p style={{
                    fontSize: "0.76rem",
                    color: "var(--text-3)",
                    padding: "6px 10px",
                    fontStyle: "italic",
                  }}>
                    No groups yet
                  </p>
                )}

                <button
                  className="sb-create-btn"
                  onClick={() => { navigate("/groups?modal=new"); closeMobile(); }}
                  data-tooltip="New Group"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>New Group</span>
                </button>
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY */}
          {recent.length > 0 && (
            <div className="sidebar__section">
              <div className="sidebar__section-label">Recent</div>
              {recent.slice(0, 4).map((item, i) => (
                <ActivityItem key={i} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer: Profile ───────────────────────────── */}
        <div className="sidebar__foot">
          <div className="sb-profile">
            <div className="sb-profile__avatar">
              {user ? getInitials(user.name) : "?"}
            </div>
            <div className="sb-profile__info">
              <div className="sb-profile__name">{user?.name || "User"}</div>
              <div className="sb-profile__email">{user?.email || ""}</div>
            </div>
            <button
              className="sb-logout"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Mobile Top Bar ──────────────────────────────────────────────
export const MobileTopBar = () => {
  const { mobileOpen, setMobileOpen } = useContext(SidebarContext);

  return (
    <div className="mobile-topbar">
      <button
        className="mobile-topbar__hamburger"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Open navigation"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>
      <span className="mobile-topbar__brand">SPLIT</span>
    </div>
  );
};

export default Sidebar;
