import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { resendSignupOtp, verifySignup } from '../features/auth/authSlice.js';

export default function VerifySignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, lastSignupEmail, lastSignupOtpForDev } = useSelector((s) => s.auth);

  const [params] = useSearchParams();
  const initialEmail = useMemo(() => params.get('email') || lastSignupEmail || '', [params, lastSignupEmail]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const onVerify = async (e) => {
    e.preventDefault();
    setMessage('');
    const action = await dispatch(verifySignup({ email, otp }));
    if (verifySignup.fulfilled.match(action)) {
      navigate('/login', { replace: true });
    }
  };

  const onResend = async (e) => {
    e.preventDefault();
    setMessage('');
    const action = await dispatch(resendSignupOtp({ email }));
    if (resendSignupOtp.fulfilled.match(action)) {
      const otpForDev = action.payload?.data?.otpForDev;
      setMessage(action.payload?.data?.message || 'OTP resent');
      if (otpForDev) setMessage(`OTP resent (dev). OTP: ${otpForDev}`);
    }
  };

  return (
    <div className="card">
      <h2>Verify Signup (OTP)</h2>
      <form onSubmit={onVerify}>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>OTP</label>
          <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          {lastSignupOtpForDev && <div className="muted">Dev OTP: {lastSignupOtpForDev}</div>}
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Verifying…' : 'Verify'}
        </button>
        <button className="secondary" style={{ marginLeft: 10 }} onClick={onResend} disabled={status === 'loading'}>
          Resend OTP
        </button>
      </form>

      {(error || message) && <div className="response">{error || message}</div>}

      <div className="links">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}
