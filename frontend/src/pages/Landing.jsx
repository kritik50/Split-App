import { useNavigate } from "react-router-dom";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Aurora background */}
      <div className="landing__bg">
        <div className="landing__grid" />
        <div className="landing__orb landing__orb--1" />
        <div className="landing__orb landing__orb--2" />
        <div className="landing__orb landing__orb--3" />
      </div>

      {/* Content */}
      <div className="landing__content">
        <div className="landing__badge">
          <span className="landing__badge-dot" />
          Expense splitting, reimagined
        </div>

        <h1 className="landing__title">SPLIT</h1>

        <p className="landing__sub">
          Track shared expenses with friends and groups.
          No stress, no confusion — just clarity.
        </p>

        <div className="landing__cta">
          <button
            className="landing__btn-primary"
            onClick={() => navigate("/login")}
          >
            Get Started
          </button>
          <button
            className="landing__btn-ghost"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
        </div>

        <div className="landing__features">
          <span className="landing__feat">⚡ Instant splits</span>
          <span className="landing__feat">👥 Group management</span>
          <span className="landing__feat">📊 Balance tracking</span>
          <span className="landing__feat">🔒 Secure &amp; private</span>
        </div>
      </div>
    </div>
  );
};

export default Landing;