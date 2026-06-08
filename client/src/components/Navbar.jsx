import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("communityhub_token");

  const handleLogout = () => {
    localStorage.removeItem("communityhub_token");
    localStorage.removeItem("communityhub_user");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        CommunityHub
      </div>

      <div className="navbar-links">
        {token ? (
          <>
            <Link to="/communities">User Side</Link>
            <Link to="/admin">Admin Panel</Link>
            <Link to="/create-community">Create Community</Link>
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/">Home</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Create Account</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;