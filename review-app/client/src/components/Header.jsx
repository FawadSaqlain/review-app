import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, hydrateUserFromStorage, logout } from '../features/auth/authSlice.js';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, adminToken, user } = useSelector((s) => s.auth);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    dispatch(hydrateUserFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  const role = adminToken ? 'admin' : token ? 'student' : 'anon';

  const onLogout = async (e) => {
    e.preventDefault();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="site-header">
      <div className="brand">
        <Link to="/" className="brand-link">
          <span className="brand-logo">
            <img
              src="/Remove background project.png"
              alt="CVUR Portal Logo"
              style={{ height: '40px', width: '70px', objectFit: 'contain', borderRadius: '6px' }}
            />
          </span>
          <div>
            <span className="brand-title">CVUR Portal</span>
            <span className="brand-tagline">See clearly, choose wisely</span>
          </div>
        </Link>
      </div>

      <button
        type="button"
        className="menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded={navOpen ? 'true' : 'false'}
        onClick={() => setNavOpen((open) => !open)}
      >
        <span className="menu-toggle-icon" />
      </button>

      <nav className={"site-nav" + (navOpen ? " is-open" : "")}>
        {role === 'anon' && (
          <>
            <Link to="/">Home</Link>
            <Link to="/signup">Sign Up</Link>
            <Link to="/login">Login</Link>
            <Link to="/admin/login">Admin</Link>
          </>
        )}

        {role === 'student' && (
          <>
            <Link to="/profile">My Profile</Link>
            <Link to="/ratings/give">Give Review</Link>
            <Link to="/ratings">View Ratings</Link>
            <Link to="/dashboard/ratings">My Reviews</Link>
            <a href="#" onClick={onLogout} title="Logout">Logout</a>
          </>
        )}

        {role === 'admin' && (
          <>
            <Link to="/admin/ratings">Admin • Dashboard</Link>
            <Link to="/admin/terms">Terms</Link>
            <Link to="/admin/offerings">Manage Offerings</Link>
            <Link to="/admin/users">Manage Users</Link>
            <a href="#" onClick={onLogout} title="Admin Logout">Admin Logout</a>
          </>
        )}
      </nav>
    </header>
  );
}
