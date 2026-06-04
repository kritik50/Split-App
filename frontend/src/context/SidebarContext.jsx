import { useCallback, useContext, useEffect, useState } from "react";
import { getSidebarData } from "../api/sidebarApi";
import { AuthContext } from "./AuthContext.js";
import { SidebarContext } from "./SidebarContext.js";

export const SidebarProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarData, setSidebarData] = useState(null);
  const [loading, setLoading] = useState(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setSidebarData(null);
      return;
    }

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

  useEffect(() => {
    refresh();
  }, [refresh]);

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
