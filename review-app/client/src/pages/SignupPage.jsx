import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { signup } from '../features/auth/authSlice.js';

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { status, error, lastSignupEmail, lastSignupOtpForDev } = useSelector((s) => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (lastSignupEmail) {
      navigate(`/verify-signup?email=${encodeURIComponent(lastSignupEmail)}`);
    }
  }, [lastSignupEmail, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const action = await dispatch(signup({ name, email, password }));
    if (signup.fulfilled.match(action)) {
      const otp = action.payload?.data?.otpForDev;
      if (otp) setMessage(`Dev OTP: ${otp}`);
    }
  };

  return (
    <div className="card">
      <h2>Sign Up</h2>
      <p className="muted">Use your CUI Vehari email in the format <code>fa22-bse-031@cuivehari.edu.pk</code>.</p>
      <form onSubmit={onSubmit}>
        <div className="form-row">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      {(error || message || lastSignupOtpForDev) && (
        <div className="response">
          {error || message || (lastSignupOtpForDev ? `Dev OTP: ${lastSignupOtpForDev}` : '')}
        </div>
      )}

      <div className="links">
        <Link to="/login">Already have an account?</Link>
      </div>
    </div>
  );
}
