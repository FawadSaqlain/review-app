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
    <div className="card profile-card">
      <div className="profile-header">
        <div className="profile-title-group">
          <div className="profile-avatar">
            <i className="fa-regular fa-user" />
          </div>
          <div>
            <h2 className="profile-title">My Profile</h2>
            <p className="profile-subtitle muted">Your verified student details for CVUR Portal</p>
          </div>
        </div>

        <div className="profile-header-actions">
          <Link to="/complete-profile" className="profile-edit-link">
            <i className="fa-regular fa-pen-to-square" style={{ marginRight: 6 }} />
            Edit profile
          </Link>
        </div>
      </div>

      {!user ? (
        <p className="muted">No profile loaded.</p>
      ) : (
        <>
          <div className="profile-grid">
            <div className="profile-field">
              <div className="profile-field-label">Email</div>
              <div className="profile-field-value">{user.email}</div>
            </div>
            {name && (
              <div className="profile-field">
                <div className="profile-field-label">Name</div>
                <div className="profile-field-value">{name}</div>
              </div>
            )}
            {user?.department?.name && (
              <div className="profile-field">
                <div className="profile-field-label">Department</div>
                <div className="profile-field-value">{user.department.name}</div>
              </div>
            )}
            {user?.program?.name && (
              <div className="profile-field">
                <div className="profile-field-label">Program</div>
                <div className="profile-field-value">{user.program.name}</div>
              </div>
            )}
            {intake && (
              <div className="profile-field">
                <div className="profile-field-label">Intake</div>
                <div className="profile-field-value">{intake}</div>
              </div>
            )}
            {user?.semesterNumber && (
              <div className="profile-field">
                <div className="profile-field-label">Semester</div>
                <div className="profile-field-value">{user.semesterNumber}</div>
              </div>
            )}
            {user?.section && (
              <div className="profile-field">
                <div className="profile-field-label">Section</div>
                <div className="profile-field-value">{user.section}</div>
              </div>
            )}
            {typeof user?.cgpa !== 'undefined' && user?.cgpa !== null && (
              <div className="profile-field">
                <div className="profile-field-label">CGPA</div>
                <div className="profile-field-value">{user.cgpa}</div>
              </div>
            )}
            {user?.phone && (
              <div className="profile-field">
                <div className="profile-field-label">Phone</div>
                <div className="profile-field-value">{user.phone}</div>
              </div>
            )}
          </div>

          {user?.idCardImage && (
            <div className="profile-id-card">
              <div className="profile-field-label">University ID (uploaded)</div>
              <img className="img-preview" src={user.idCardImage} alt="University ID" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
