import { useContext } from "react";
import { SidebarContext } from "../context/SidebarContext";
import Sidebar, { MobileTopBar } from "./Sidebar";
import "../components/Sidebar.css";

/**
 * AppLayout — wraps authenticated pages with the sidebar + main content area.
 *
 * Usage:
 *   <AppLayout>
 *     <Groups />
 *   </AppLayout>
 *
 * The sidebar is pulled from SidebarContext (already aware of collapsed state).
 */
const AppLayout = ({ children }) => {
  const { collapsed } = useContext(SidebarContext);

  return (
    <div className={`app-layout ${collapsed ? "app-layout--collapsed" : ""}`}>
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar (hamburger) */}
      <MobileTopBar />

      {/* Page content */}
      <main className="app-layout__main">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
