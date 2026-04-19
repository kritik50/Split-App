import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useContext } from "react";

import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Groups       from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
// CreateGroup is now a modal inside Groups.jsx
import AddExpense   from "./pages/AddExpense";
import Navbar       from "./components/Navbar";
import AppLayout    from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing      from "./pages/Landing";
import Auth         from "./pages/Auth";

import { AuthContext }      from "./context/AuthContext";
import { SidebarProvider }  from "./context/SidebarContext";

// ── Pages that use the sidebar layout ───────────────────────────
const PUBLIC_PATHS = ["/", "/login", "/register"];

function AppContent() {
  const location = useLocation();
  const { user, authLoading } = useContext(AuthContext);

  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  // While verifying token → don't flash layouts
  if (authLoading && !isPublic) {
    return null;
  }

  // Show navbar only on public pages
  // Show sidebar layout only on authenticated pages
  const showNavbar  = isPublic;
  const showSidebar = !isPublic && !!user;


  // The inner routes (always rendered)
  const routeTree = (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<Auth />} />
      <Route path="/register" element={<Auth />} />

      {/* Protected — all wrapped in AppLayout via ProtectedRoute */}
      <Route path="/groups"           element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/group/:id"        element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
      <Route path="/group/:id/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
      {/* /create-group removed — now a modal on the Groups page */}

      {/* 404 */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );

  return (
    <>
      {/* Public navbar (Landing / Auth) */}
      {showNavbar && <Navbar />}

      {/* Authenticated layout: sidebar + content */}
      {showSidebar ? (
        <SidebarProvider>
          <AppLayout>
            {routeTree}
          </AppLayout>
        </SidebarProvider>
      ) : (
        routeTree
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;