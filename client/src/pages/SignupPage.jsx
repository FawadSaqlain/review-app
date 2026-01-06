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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (lastSignupEmail) {
      navigate(`/verify-signup?email=${encodeURIComponent(lastSignupEmail)}`);
    }
  }, [lastSignupEmail, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
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

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    const action = await dispatch(signup({ name, email, password, confirmPassword }));
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
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="form-row">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
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
