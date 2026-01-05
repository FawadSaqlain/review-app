import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../features/auth/authSlice.js';

export default function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const emailPattern = /^(?:fa|sp)\d{2}-(?:baf|bag|bba|bcs|bec|bed|ben|bes|bmd|bse|bsm|bty)-\d{3}@cuivehari\.edu\.pk$/i;
    if (!emailPattern.test(email.trim())) {
      setMessage('Email must be a valid CUI Vehari address like fa22-bse-031@cuivehari.edu.pk.');
      return;
    }
    const action = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(action)) {
      const msg = action.payload?.data?.message || 'If the email exists, a reset code will be sent to your email.';
      setMessage(msg);
      navigate('/reset-password', { replace: true, state: { email } });
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
