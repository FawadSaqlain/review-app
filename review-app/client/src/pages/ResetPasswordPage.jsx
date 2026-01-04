import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../features/auth/authSlice.js';

export default function ResetPasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.auth);
  const location = useLocation();
  const email = location.state && location.state.email ? location.state.email : '';
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    const action = await dispatch(resetPassword({ email, otp, newPassword, confirmPassword }));
    if (resetPassword.fulfilled.match(action)) {
      const msg = action.payload?.data?.message || 'Password updated. You may now log in.';
      setMessage(msg);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="card">
      <h2>Reset Password</h2>
      {!email && (
        <p className="response">Missing email. Please start from the Forgot Password page again.</p>
      )}
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label>OTP Code</label>
          <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>

      {(error || message) && <div className="response">{error || message}</div>}

      <div className="links">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}
