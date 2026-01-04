import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { adminLogin } from '../../features/auth/authSlice.js';

export default function AdminLoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const { status, error, adminToken } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (adminToken) {
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      navigate(next ? decodeURIComponent(next) : '/admin/dashboard', { replace: true });
    }
  }, [adminToken, location.search, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(adminLogin({ email, password }));
  };

  return (
    <div className="card">
      <h2>Admin Login</h2>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Logging in…' : 'Login as Admin'}
        </button>
      </form>

      {error && <div className="response">{error}</div>}

      <div className="links">
        <Link to="/login">Student login</Link>
      </div>
    </div>
  );
}
