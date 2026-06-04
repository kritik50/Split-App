import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext.js";
import { registerUser } from "../api/authApi";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, CheckCircle } from "lucide-react";
import "./Auth.css";

const Auth = () => {
  const location = useLocation();
  const initialMode = location.pathname === "/register" ? false : true;

  const [isLogin, setIsLogin] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setError("");
    setSuccessMsg("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const switchMode = (toLogin) => {
    setIsLogin(toLogin);
    setError("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        const ok = await login(form);
        if (ok) {
          navigate("/groups");
        } else {
          setError("Invalid email or password.");
        }
      } else {
        if (!form.name.trim()) { setError("Name is required."); setLoading(false); return; }
        await registerUser(form);
        setSuccessMsg("Account created! Please sign in.");
        setIsLogin(true);
        setForm({ name: "", email: form.email, password: "" });
      }
    } catch (err) {
      if (!err.response) {
        setError("Could not connect to the server. Is the backend running?");
      } else {
        const msg = err.response.data?.detail || "Something went wrong.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__orb auth__orb--1" />
      <div className="auth__orb auth__orb--2" />

      <div className="auth__card">
        {/* Header */}
        <div className="auth__head">
          <div className="auth__logo">
            <span className="auth__logo-dot" />
            SPLIT
          </div>
          <p className="auth__tagline">
            {isLogin ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="auth__tabs">
          <div className={`auth__tab-slider ${!isLogin ? "auth__tab-slider--right" : ""}`} />
          <button
            className={`auth__tab-btn ${isLogin ? "auth__tab-btn--active" : ""}`}
            onClick={() => switchMode(true)}
          >
            Sign in
          </button>
          <button
            className={`auth__tab-btn ${!isLogin ? "auth__tab-btn--active" : ""}`}
            onClick={() => switchMode(false)}
          >
            Register
          </button>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="auth__success">
            <CheckCircle size={15} />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form className="auth__form" onSubmit={handleSubmit}>

          {/* Name — only for register */}
          <div className={`auth__name-wrap ${isLogin ? "auth__name-wrap--hidden" : ""}`}>
            <div className="auth__field">
              <User size={16} className="auth__field-icon" />
              <input
                className="auth__input"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="auth__field">
            <Mail size={16} className="auth__field-icon" />
            <input
              className="auth__input"
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className="auth__field">
            <Lock size={16} className="auth__field-icon" />
            <input
              className="auth__input"
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{ fontSize: "0.82rem", color: "var(--red)", textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            className="auth__submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? (isLogin ? "Signing in…" : "Creating account…")
              : (isLogin ? "Sign in" : "Create account")}
            <ArrowRight size={15} className="auth__submit-arrow" />
          </button>
        </form>

        <p className="auth__note">
          {isLogin
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            style={{
              background: "none", border: "none",
              color: "var(--brand-hover)", fontWeight: 600,
              cursor: "pointer", fontSize: "inherit",
            }}
            onClick={() => switchMode(!isLogin)}
          >
            {isLogin ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
