import { useEffect, useState } from "react";
import { loginUser } from "../api/authApi";
import api from "../api/api";
import { AuthContext } from "./AuthContext.js";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(() =>
    Boolean(localStorage.getItem("token"))
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
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

      const meRes = await api.get("/auth/me");
      setUser(meRes.data);
      setAuthLoading(false);

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err) {
      console.error("Refresh user error:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setAuthLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
