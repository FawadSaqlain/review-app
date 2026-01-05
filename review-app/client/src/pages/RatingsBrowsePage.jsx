import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { fetchMe } from '../features/auth/authSlice.js';

function formatName(name) {
  if (!name) return '';
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return `${name.first || ''}${name.last ? ' ' + name.last : ''}`.trim();
  }
  return String(name);
}

function teacherLabel(teacher) {
  if (!teacher) return '';
  if (typeof teacher === 'string') return teacher;
  return formatName(teacher.name) || teacher.email || '';
}

function courseLabel(course) {
  if (!course) return '';
  const code = course.code || '';
  const title = course.title || course.name || '';
  return `${code}${code && title ? ' - ' : ''}${title}`.trim();
}

export default function RatingsBrowsePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((s) => s.auth);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const query = useMemo(() => ({ search, page: 1, limit: 100 }), [search]);

  useEffect(() => {
    // Ensure we know who the user is
    if (!user) {
      dispatch(fetchMe());
      return;
    }

    // If profile is not complete, send to Complete Profile first
    if (user && user.profileComplete === false) {
      navigate('/complete-profile', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStatus('loading');
        setError(null);
        const qs = new URLSearchParams();
        if (query.search) qs.set('search', query.search);
        qs.set('page', String(query.page));
        qs.set('limit', String(query.limit));
        const res = await apiRequest(`/api/ratings/summaries?${qs.toString()}`);
        if (cancelled) return;
        const data = res && res.data ? res.data : {};
        setItems(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setLimit(data.limit || query.limit);
        setStatus('succeeded');
      } catch (e) {
        if (cancelled) return;
        setError(e.message || 'Failed to load summaries');
        setStatus('failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, dispatch, navigate, query]);

  const onSubmit = (e) => {
    e.preventDefault();
  };

  const pageCount = Math.max(1, Math.ceil((total || 0) / (limit || 25)));

  return (
    <>
      <div className="card">
        <h2>Ratings</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          Only summarized feedback for inactive terms is shown. Active-term ratings are not displayed.
        </p>

        <form className="filters filters-compact" onSubmit={onSubmit}>
          <div className="filters-search">
            <label htmlFor="student-ratings-search">Search</label>
            <div className="filters-search-input">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                id="student-ratings-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by course, teacher, or term"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Results</h3>
        {error && <div className="response">{error}</div>}
        {status === 'loading' && <p className="muted">Loading…</p>}

        <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 12 }}>
          {(items || []).map((s) => {
            const course = courseLabel(s?.offering?.course);
            const teacher = teacherLabel(s?.offering?.teacher);
            const termName = s?.term?.name || '';
            const overall = typeof s.avgOverall === 'number' ? s.avgOverall : null;
            const rounded = overall != null ? Math.round(overall) : null;

            let badgeClass = 'rating-badge';
            if (rounded != null) {
              if (rounded <= 2) badgeClass += ' rating-badge-bad';
              else if (rounded === 3) badgeClass += ' rating-badge-ok';
              else if (rounded >= 4) badgeClass += ' rating-badge-good';
            }

            return (
              <li key={s._id} className="rating-card">
                <div className="rating-card-header">
                  <div>
                    {(course || teacher || termName) && (
                      <div>
                        <strong>
                          {course || 'Course'}
                          {teacher ? ` — ${teacher}` : ''}
                        </strong>
                        {termName ? <span className="muted"> — {termName}</span> : null}
                      </div>
                    )}

                    <div className="rating-card-meta">
                      <span>
                        <i className="fa-solid fa-users" style={{ marginRight: 4, color: 'var(--primary)' }} />
                        {typeof s.count === 'number'
                          ? `${s.count} review${s.count === 1 ? '' : 's'}`
                          : 'No reviews'}
                      </span>
                      <span>
                        <i className="fa-solid fa-percent" style={{ marginRight: 4, color: 'var(--primary)' }} />
                        Avg marks:{' '}
                        {typeof s.avgMarks === 'number' ? s.avgMarks.toFixed(2) : 'N/A'}
                      </span>
                      <span>
                        <i className="fa-regular fa-calendar" style={{ marginRight: 4 }} />
                        Updated:{' '}
                        {new Date(s.updatedAt || s.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className={badgeClass}>
                      {overall != null ? overall.toFixed(2) : 'N/A'} / 5
                    </div>
                  </div>
                </div>

                {s.summary && <p className="rating-card-summary">{s.summary}</p>}
              </li>
            );
          })}
          {(!items || items.length === 0) && <li className="muted">No summaries found.</li>}
        </ul>

        <div style={{ marginTop: 12 }} className="muted">
          Total: {total} • Page: {page} / {pageCount}
        </div>
      </div>
    </>
  );
}
