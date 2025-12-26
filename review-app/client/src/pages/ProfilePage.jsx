import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from '../features/auth/authSlice.js';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  if (status === 'loading' && !user) {
    return (
      <div className="card">
        <h2>My Profile</h2>
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="card">
        <h2>My Profile</h2>
        <div className="response">{error}</div>
      </div>
    );
  }

  const name = user?.name ? `${user.name.first || ''} ${user.name.last || ''}`.trim() : '';
  const intake = user?.intake ? `${user.intake.season || ''}${String(user.intake.year || '')}` : '';

  return (
    <div className="card">
      <h2>My Profile</h2>
      {!user ? (
        <p className="muted">No profile loaded.</p>
      ) : (
        <>
          <p><strong>Email:</strong> {user.email}</p>
          {name && <p><strong>Name:</strong> {name}</p>}
          {user?.department?.name && <p><strong>Department:</strong> {user.department.name}</p>}
          {user?.program?.name && <p><strong>Program:</strong> {user.program.name}</p>}
          {intake && <p><strong>Intake:</strong> {intake}</p>}
          {user?.semesterNumber && <p><strong>Semester:</strong> {user.semesterNumber}</p>}
          {user?.section && <p><strong>Section:</strong> {user.section}</p>}
          {typeof user?.cgpa !== 'undefined' && user?.cgpa !== null && <p><strong>CGPA:</strong> {user.cgpa}</p>}
          {user?.phone && <p><strong>Phone:</strong> {user.phone}</p>}

          {user?.idCardImage && (
            <div style={{ marginTop: 12 }}>
              <div className="muted">University ID (uploaded)</div>
              <img className="img-preview" src={user.idCardImage} alt="University ID" />
            </div>
          )}

          <div className="links">
            <Link to="/complete-profile">Update / Complete Profile</Link>
          </div>
        </>
      )}
    </div>
  );
}
