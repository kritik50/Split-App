import { createContext, useState, useEffect } from "react";
import { loginUser } from "../api/authApi";
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // ✅ Store full user object {id, name, email}, not just token
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── On mount: re-hydrate user from stored token ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data); // { id, name, email }
      })
      .catch(() => {
        // Token invalid or expired — clear it
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const login = async (formData) => {
    try {
      const res = await loginUser(formData);
      const token = res.data.access_token;
      localStorage.setItem("token", token);

      // Fetch full user info after login
      const meRes = await api.get("/auth/me");
      setUser(meRes.data); // { id, name, email }

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};