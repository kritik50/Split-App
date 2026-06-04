import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useContext } from "react";
import "./App.css";

import Groups        from "./pages/Groups";
import GroupDetails  from "./pages/GroupDetails";
import AddExpense    from "./pages/AddExpense";
import AppLayout     from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing       from "./pages/Landing";
import Auth          from "./pages/Auth";
import AllExpenses   from "./pages/AllExpenses";
import Balances      from "./pages/Balances";
import Activity      from "./pages/Activity";
import NotFound      from "./pages/NotFound";

import { AuthContext }      from "./context/AuthContext.js";
import { SidebarProvider }  from "./context/SidebarContext.jsx";

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

  // Public pages render without the shared navbar/sidebar shell.
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
      <Route path="/expenses"         element={<ProtectedRoute><AllExpenses /></ProtectedRoute>} />
      <Route path="/balances"         element={<ProtectedRoute><Balances /></ProtectedRoute>} />
      <Route path="/activity"         element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/group/:id"        element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
      <Route path="/group/:id/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
      {/* /create-group removed — now a modal on the Groups page */}

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <>
      {showSidebar ? (
        <SidebarProvider>
          <AppLayout>
            <ErrorBoundary resetKey={location.pathname}>
              {routeTree}
            </ErrorBoundary>
          </AppLayout>
        </SidebarProvider>
      ) : (
        <ErrorBoundary resetKey={location.pathname}>
          {routeTree}
        </ErrorBoundary>
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
