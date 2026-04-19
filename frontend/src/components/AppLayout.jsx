import { useContext } from "react";
import { SidebarContext } from "../context/SidebarContext";
import Sidebar, { MobileTopBar } from "./Sidebar";
import "../components/Sidebar.css";


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
