import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      <div className="card">
        <h1>CVUR Portal</h1>
        <p className="muted">A COMSATS Vehari unofficial review portal for courses & instructors.</p>
        <div className="links">
          <Link to="/signup">Create Account</Link>
          <Link to="/login">Login</Link>
          <Link to="/ratings">Browse Ratings</Link>
        </div>
      </div>

      <div className="card">
        <h2>What you can do</h2>
        <p className="muted">Submit anonymized feedback, explore rating trends, and make better academic decisions.</p>
        <div className="links">
          <Link to="/forgot-password">Forgot Password</Link>
          <Link to="/admin/login">Admin Login</Link>
        </div>
      </div>
    </>
  );
}
