import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useContext(AuthContext);

  // Wait for AuthContext to verify token before deciding
  if (authLoading) {
    return null; // or a spinner
  }

  // No valid user → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;