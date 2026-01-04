import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-graduation-cap" style={{ color: 'var(--primary)', fontSize: '1.4rem' }} />
            <span>CVUR Portal</span>
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>COMSATS Vehari • Unofficial Reviews</span>
        </h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          CVUR Portal is an unofficial course & instructor review system for COMSATS Vehari students.
          It helps you see how previous students rated courses and teachers, so you can make clearer,
          more confident academic choices.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 20 }}>
          <div style={{ flex: '1 1 260px' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-regular fa-star" style={{ color: 'var(--primary)' }} />
              <span>Why students use CVUR</span>
            </h3>
            <ul style={{ paddingLeft: 18, marginTop: 8, marginBottom: 12, color: 'var(--muted)', fontSize: '0.95rem', listStyle: 'none' }}>
              <li style={{ marginBottom: 6 }}>
                <i className="fa-solid fa-user-group" style={{ marginRight: 8, color: 'var(--primary)' }} />
                See real feedback from seniors before selecting courses or teachers.
              </li>
              <li style={{ marginBottom: 6 }}>
                <i className="fa-solid fa-scale-balanced" style={{ marginRight: 8, color: 'var(--primary)' }} />
                Avoid surprises: check past difficulty, workload and teaching style.
              </li>
              <li>
                <i className="fa-solid fa-shield-heart" style={{ marginRight: 8, color: 'var(--primary)' }} />
                Contribute anonymously so juniors benefit from your experience.
              </li>
            </ul>
            <div className="links">
              <Link to="/signup">Create Student Account</Link>
              <Link to="/login">Student Login</Link>
            </div>
          </div>

          <div style={{ flex: '1 1 260px' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-route" style={{ color: 'var(--primary)' }} />
              <span>How it works</span>
            </h3>
            <ol style={{ paddingLeft: 20, marginTop: 8, marginBottom: 12, color: 'var(--muted)', fontSize: '0.95rem' }}>
              <li style={{ marginBottom: 4 }}>
                <strong>Sign up</strong> and verify your COMSATS email.
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>Review</strong> completed courses and instructors honestly.
              </li>
              <li>
                <strong>Decide</strong> by browsing rating summaries when planning your next semester.
              </li>
            </ol>
            <div className="links">
              <Link to="/ratings">Browse Public Ratings</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Start planning your next semester today</h2>
        <p className="muted" style={{ maxWidth: 700 }}>
          Join the CVUR community, add your voice through fair and constructive reviews, and use the
          collective experience of your batch and seniors to choose the right mix of courses and
          instructors.
        </p>
        <div className="links">
          <Link to="/ratings">Browse Ratings</Link>
          <Link to="/signup">Get Started</Link>
        </div>
      </div>
    </>
  );
}
