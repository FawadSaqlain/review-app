import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../features/auth/authSlice.js';

export default function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const action = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(action)) {
      const msg = action.payload?.data?.message || 'If the email exists, a reset link will be sent.';
      const token = action.payload?.data?.token;
      setMessage(token ? `${msg} (dev token: ${token})` : msg);
    }
  };

  return (
    <div className="card">
      <h2>Forgot Password</h2>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Submitting…' : 'Request Reset'}
        </button>
      </form>

      {(error || message) && <div className="response">{error || message}</div>}

      <div className="links">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}
