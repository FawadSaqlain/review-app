import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, login } from '../features/auth/authSlice.js';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { status, error, token } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      dispatch(fetchMe());
      const params = new URLSearchParams(location.search);
      const next = params.get('next');
      navigate(next ? decodeURIComponent(next) : '/profile', { replace: true });
    }
  }, [dispatch, token, location.search, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const action = await dispatch(login({ email, password }));
      if (login.rejected.match(action)) return;
      const user = action.payload?.data?.user;
      if (user && user.profileComplete === false) {
        navigate('/complete-profile', { replace: true });
      }
    } catch (e2) {
      // handled by slice
    }
  };

  return (
    <div className="card">
      <h2>Login</h2>
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
          {status === 'loading' ? 'Logging in…' : 'Login'}
        </button>
      </form>

      {(error || message) && <div className="response">{error || message}</div>}

      <div className="links">
        <Link to="/signup">Create an account</Link>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}
