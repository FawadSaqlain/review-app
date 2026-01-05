import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, login } from '../features/auth/authSlice.js';
import { apiRequest } from '../lib/api.js';

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
    }
  }, [dispatch, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Strict frontend validation
    const emailPattern = /^(?:fa|sp)\d{2}-(?:baf|bag|bba|bcs|bec|bed|ben|bes|bmd|bse|bsm|bty)-\d{3}@cuivehari\.edu\.pk$/i;
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;

    if (!emailPattern.test(email.trim())) {
      setMessage('Email must be a valid CUI Vehari address like fa22-bse-031@cuivehari.edu.pk.');
      return;
    }

    if (!passwordPattern.test(password)) {
      setMessage('Password must be 8-16 characters and include uppercase, lowercase, number, and special character.');
      return;
    }
    try {
      const action = await dispatch(login({ email, password }));
      if (login.rejected.match(action)) return;
      const user = action.payload?.data?.user;

      // If profile is not complete, always force complete-profile first
      if (user && user.profileComplete === false) {
        navigate('/complete-profile', { replace: true });
        return;
      }

      // Profile is complete (or user missing) -> decide based on pending reviews
      try {
        const res = await apiRequest('/api/ratings/give-options');
        const data = res && res.data ? res.data : {};
        const offerings = data.offerings || [];

        if (offerings.length > 0) {
          // There are still offerings left to rate
          navigate('/ratings/give', { replace: true });
        } else {
          // All reviews done; send to ratings browse
          navigate('/ratings', { replace: true });
        }
      } catch (err) {
        // If anything goes wrong, fall back to ratings page
        navigate('/ratings', { replace: true });
      }
    } catch (e2) {
      // handled by slice
      console.log("login redirection error ",e2);
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
