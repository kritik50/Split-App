import { useNavigate } from "react-router-dom";
import { Home, Search } from "lucide-react";
import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="nf">
      <div className="nf__orb nf__orb--1" />
      <div className="nf__orb nf__orb--2" />

      <div className="nf__card">
        <div className="nf__code">404</div>
        <h1 className="nf__title">Page not found</h1>
        <p className="nf__text">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="nf__actions">
          <button className="nf__home-btn" onClick={() => navigate("/")}>
            <Home size={15} /> Go Home
          </button>
          <button className="nf__back-btn" onClick={() => navigate(-1)}>
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
