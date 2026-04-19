import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { getSidebarData } from "../api/sidebarApi";

export const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  // ── UI state ─────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Data ─────────────────────────────────────────────────────
  const [sidebarData, setSidebarData] = useState(null);
  const [loading, setLoading]         = useState(false);

  // ── Fetch whenever user changes ───────────────────────────────
  const refresh = useCallback(async () => {
    if (!user) { setSidebarData(null); return; }
    try {
      setLoading(true);
      const res = await getSidebarData();
      setSidebarData(res.data);
    } catch (err) {
      console.error("Sidebar data error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Close mobile drawer on route change
  const closeMobile = () => setMobileOpen(false);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        closeMobile,
        sidebarData,
        loading,
        refresh,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
