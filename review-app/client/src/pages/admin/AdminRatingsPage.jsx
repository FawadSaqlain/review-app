import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

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

export default function AdminRatingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const query = useMemo(() => ({ search, page: 1, limit: 200 }), [search]);

  useEffect(() => {
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
        setStatus('failed');
        setError(e.message || 'Failed to load summaries');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <>
      <div className="card">
        <h2>Admin • Ratings</h2>
        <p className="muted">Summary-only view for inactive terms. Active-term ratings are not displayed.</p>

        <form className="filters" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="course or teacher" />
          </div>
        </form>

        {error && <div className="response">{error}</div>}
      </div>

      <div className="card">
        <h3>Results</h3>
        {status === 'loading' && <p className="muted">Loading…</p>}

        <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: 12 }}>
          {(items || []).map((s) => {
            const offering = `${teacherLabel(s?.offering?.teacher)} — ${courseLabel(s?.offering?.course)}`.trim();
            const termName = s?.term?.name || '';
            return (
              <li
                key={s._id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  marginBottom: 8,
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <strong>{offering}</strong>
                  {termName ? <span className="muted"> — {termName}</span> : null}
                </div>
                <strong>Summary (stored):</strong>
                <p>{s.summary}</p>
                <p>
                  <strong>Count:</strong> {typeof s.count === 'number' ? s.count : 'N/A'}
                  &nbsp; <strong>Avg overall:</strong>{' '}
                  {typeof s.avgOverall === 'number' ? s.avgOverall.toFixed(2) : 'N/A'}
                  &nbsp; <strong>Avg marks:</strong>{' '}
                  {typeof s.avgMarks === 'number' ? s.avgMarks.toFixed(2) : 'N/A'}
                </p>
                <em>Generated: {new Date(s.updatedAt || s.createdAt).toLocaleString()}</em>
              </li>
            );
          })}
          {(!items || items.length === 0) && <li className="muted">No summaries found.</li>}
        </ul>

        <div style={{ marginTop: 12 }} className="muted">
          Total: {total} • Page: {page} / {Math.max(1, Math.ceil((total || 0) / (limit || 25)))}
        </div>
      </div>
    </>
  );
}
