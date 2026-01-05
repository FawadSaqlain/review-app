import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMe } from '../features/auth/authSlice.js';
import { listRatings } from '../features/ratings/ratingsSlice.js';

function offeringLabel(r) {
  try {
    const t = r?.offering?.teacher;
    const c = r?.offering?.course;

    const teacherName = t
      ? t.name
        ? `${t.name.first || ''}${t.name.last ? ' ' + t.name.last : ''}`.trim()
        : t.email || 'TBD'
      : 'TBD';

    const courseLabel = c ? `${c.code ? c.code + ' - ' : ''}${c.title || c.name || ''}`.trim() : '';

    return `${teacherName}${courseLabel ? ' — ' + courseLabel : ''}`;
  } catch (e) {
    return 'N/A';
  }
}

export default function StudentRatingsDashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((s) => s.auth);
  const ratings = useSelector((s) => s.ratings);

  const [search, setSearch] = useState('');

  const query = useMemo(() => {
    const studentId = user?._id || user?.id || null;
    return {
      search,
      student: studentId || undefined,
      termActive: true,
      page: 1,
      limit: 50,
      sort: 'createdAt',
      order: 'desc'
    };
  }, [search, user]);

  useEffect(() => {
    if (!user) {
      dispatch(fetchMe());
      return;
    }

    if (user && user.profileComplete === false) {
      navigate('/complete-profile', { replace: true });
      return;
    }
  }, [dispatch, user, navigate]);

  useEffect(() => {
    if (user && user.profileComplete !== false) {
      dispatch(listRatings(query));
    }
  }, [dispatch, user, query]);

  const onApply = (e) => {
    e.preventDefault();
    if (user) dispatch(listRatings(query));
  };

  return (
    <div className="card">
      <h1>
        <i className="fa-solid fa-star-half-stroke" style={{ marginRight: 8, color: 'var(--primary)' }} />
        My Ratings
      </h1>

      {ratings.error && <div className="response">{ratings.error}</div>}

      <div id="results">
        <table className="table">
          <thead>
            <tr>
              <th>Offering (Teacher — Course)</th>
              <th>Overall</th>
              <th>Marks</th>
              <th>Comment</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(ratings.items || []).map((r) => (
              <tr key={r._id}>
                <td>{offeringLabel(r)}</td>
                <td>{r.overallRating}</td>
                <td>{r.obtainedMarks}</td>
                <td>{r.comment || ''}</td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/ratings/edit/${r._id}`);
                    }}
                    title="Edit rating"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <i className="fa-regular fa-pen-to-square" style={{ color: 'var(--primary)' }} />
                  </button>
                </td>
              </tr>
            ))}
            {(!ratings.items || ratings.items.length === 0) && (
              <tr>
                <td colSpan={6} className="muted">
                  No ratings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
