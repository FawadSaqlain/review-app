import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { apiRequest } from '../lib/api.js';
import { fetchMe } from '../features/auth/authSlice.js';

export default function StudentGiveReviewPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      dispatch(fetchMe());
      return;
    }

    if (user && user.profileComplete === false) {
      navigate('/complete-profile', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest('/api/ratings/give-options');
        if (cancelled) return;
        const data = res && res.data ? res.data : {};
        setOfferings(data.offerings || []);
        setActiveTerm(data.activeTerm || null);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load offerings to rate');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, dispatch, navigate]);

  const handleGiveReview = (offering) => {
    if (!offering || !offering._id) return;
    navigate(`/ratings/give/${offering._id}`, { state: { offering } });
  };

  const activeTermId = activeTerm && activeTerm._id ? String(activeTerm._id) : null;

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-star-half-stroke"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Give Reviews
      </h1>

      <div className="form-row" style={{ marginTop: 8 }}>
        {activeTerm ? (
          <span>
            Term: <strong>{activeTerm.name} (active)</strong>
          </span>
        ) : (
          <span>
            Term: <strong>Not available</strong>
          </span>
        )}
      </div>

      {error && (
        <div className="response" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {loading && <p className="muted" style={{ marginTop: 8 }}>Loading offerings you can rate…</p>}

      {!loading && !error && (
        <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 12 }}>
          {offerings
            .filter((o) => {
              if (!activeTermId) return true;
              if (!o || !o.term) return false;
              const termId = String(o.term._id || o.term);
              return termId === activeTermId;
            })
            .map((o) => (
              <li
                key={o._id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>
                    {o.course && (o.course.title || o.course.name)
                      ? o.course.title || o.course.name
                      : 'Course'}
                  </strong>{' '}
                  by{' '}
                  {o.teacher && o.teacher.name
                    ? o.teacher.name.first || o.teacher.name.last || 'Teacher'
                    : 'Teacher'}
                  {o.section ? ` (Section ${o.section})` : ''}
                </div>
                <button type="button" onClick={() => handleGiveReview(o)}>
                  Give Review
                </button>
              </li>
            ))}

          {offerings.length === 0 && (
            <li className="muted">No classes available to rate right now.</li>
          )}
        </ul>
      )}
    </div>
  );
}
