import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleBrand = () => navigate(user ? "/groups" : "/");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <button className="navbar__brand" onClick={handleBrand}>
          <span className="navbar__brand-dot" />
          SPLIT
        </button>

        {user && (
          <div className="navbar__actions">
            <button
              className="navbar__link"
              onClick={() => navigate("/groups")}
            >
              My Groups
            </button>

            <button className="navbar__logout" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;