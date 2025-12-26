import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

export default function AdminTermsPage() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [rowDates, setRowDates] = useState({}); // termId -> { startDate, endDate }
  const [newTermSeason, setNewTermSeason] = useState('fa');
  const [newTermYear, setNewTermYear] = useState('');
  const [newTermStartDate, setNewTermStartDate] = useState('');
  const [newTermEndDate, setNewTermEndDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const res = await apiRequest('/api/admin/terms');
        if (!cancelled) {
          const list = (res && res.data && res.data.terms) || [];
          setTerms(list);
          const initial = {};
          list.forEach(t => {
            initial[t._id] = {
              startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
              endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : ''
            };
          });
          setRowDates(initial);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load terms');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRowDateChange = (id, field, value) => {
    setRowDates(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { startDate: '', endDate: '' }),
        [field]: value
      }
    }));
  };

  const reload = () => {
    // simple reload by re-running effect logic
    setLoading(true);
    setError(null);
    setMessage(null);
    apiRequest('/api/admin/terms')
      .then(res => {
        const list = (res && res.data && res.data.terms) || [];
        setTerms(list);
        const initial = {};
        list.forEach(t => {
          initial[t._id] = {
            startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
            endDate: t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : ''
          };
        });
        setRowDates(initial);
      })
      .catch(err => setError(err.message || 'Failed to load terms'))
      .finally(() => setLoading(false));
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    const year = newTermYear.trim();
    if (!year || !newTermStartDate || !newTermEndDate) return;

    // Validate date range: end must be after start
    const start = new Date(newTermStartDate);
    const end = new Date(newTermEndDate);
    if (!(start instanceof Date && !Number.isNaN(start.getTime())) ||
        !(end instanceof Date && !Number.isNaN(end.getTime())) ||
        end <= start) {
      setError('End date must be after Start date for the new term.');
      return;
    }
    const name = `${newTermSeason}${year}`;
    try {
      setError(null);
      setMessage(null);
      await apiRequest('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate: newTermStartDate,
          endDate: newTermEndDate,
        }),
      });
      setNewTermYear('');
      setNewTermSeason('fa');
      setNewTermStartDate('');
      setNewTermEndDate('');
      setMessage('Term created.');
      reload();
    } catch (err) {
      setError(err.message || 'Failed to create term');
    }
  };

  const handleActivate = async (termId) => {
    try {
      setError(null);
      setMessage(null);
      await apiRequest(`/api/admin/terms/${termId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setMessage('Term activated.');
      reload();
    } catch (err) {
      setError(err.message || 'Failed to activate term');
    }
  };

  const handleSaveDates = async (termId) => {
    // kept for completeness but not used in the EJS-mimicking UI
    try {
      setError(null);
      setMessage(null);
      const row = rowDates[termId] || { startDate: '', endDate: '' };
      await apiRequest(`/api/admin/terms/${termId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: row.startDate || undefined,
          endDate: row.endDate || undefined
        })
      });
      setMessage('Term dates saved.');
      reload();
    } catch (err) {
      setError(err.message || 'Failed to save term');
    }
  };

  const handlePromote = async (termId) => {
    try {
      setError(null);
      setMessage(null);
      const row = rowDates[termId] || { startDate: '', endDate: '' };
      await apiRequest(`/api/admin/terms/${termId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: row.startDate || undefined,
          endDate: row.endDate || undefined
        })
      });
      setMessage('Term promoted and next term created (if applicable).');
      reload();
    } catch (err) {
      setError(err.message || 'Failed to promote term');
    }
  };

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-calendar-days"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Admin Terms
      </h1>
      <p>
        Note: Terms must have Start and End dates before they can be activated. To create new
        terms, use the admin API or add via the database.
      </p>

      {error && (
        <div
          className="response"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Simple create-term form for convenience */}
      <form
        onSubmit={handleCreateTerm}
        className="new-term-form"
        style={{ marginTop: 12 }}
      >
        <div className="new-term-row">
          <div className="new-term-field">
            <label htmlFor="newTermSeason">Season</label>
            <select
              id="newTermSeason"
              value={newTermSeason}
              onChange={(e) => setNewTermSeason(e.target.value)}
              className="new-term-control"
            >
              <option value="fa">FA</option>
              <option value="sp">SP</option>
            </select>
          </div>
          <div className="new-term-field">
            <label htmlFor="newTermYear">Year</label>
            <input
              id="newTermYear"
              type="number"
              value={newTermYear}
              onChange={(e) => setNewTermYear(e.target.value)}
              placeholder="e.g. 25"
              className="new-term-control"
            />
          </div>
        </div>
        <div className="new-term-row">
          <div className="new-term-field new-term-field-wide">
            <label htmlFor="newTermStartDate">Start Date</label>
            <input
              id="newTermStartDate"
              type="date"
              value={newTermStartDate}
              onChange={(e) => setNewTermStartDate(e.target.value)}
              className="term-input new-term-control"
            />
          </div>
          <div className="new-term-field new-term-field-wide">
            <label htmlFor="newTermEndDate">End Date</label>
            <input
              id="newTermEndDate"
              type="date"
              value={newTermEndDate}
              onChange={(e) => setNewTermEndDate(e.target.value)}
              className="term-input new-term-control"
            />
          </div>
        </div>
        <div className="new-term-actions">
          <button type="submit" disabled={loading} className="new-term-control new-term-submit">
            Create Term
          </button>
        </div>
      </form>
      {message && !error && (
        <div
          className="response"
          style={{
            background: '#ecfdf3',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          Success: {message}
        </div>
      )}

      <h2 style={{ marginTop: 16 }}>Existing Terms</h2>

      {/* Inline styles to match the admin-terms.ejs table appearance */}
      <style>{`
        .admin-terms-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .admin-terms-table th, .admin-terms-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: middle; }
        .admin-terms-table th { background: #111827; color:#f9fafb; font-weight: 600; }

        .term-input { width: 140px; box-sizing: border-box; }
        .term-actions { display: flex; gap: 8px; align-items: center; }
        .term-actions .small-btn { padding: 6px 10px; font-size: 13px; }
        .muted { color: #666; font-size: 13px; }
        @media (max-width: 720px) { .term-input { width: 100px; } .term-actions { flex-direction: column; align-items: stretch; } }

        .new-term-form { display: flex; flex-direction: column; gap: 10px; }
        /* 2x2 matrix on desktop: label+input pairs in two columns per row */
        .new-term-row { display: flex; flex-wrap: nowrap; gap: 40px; align-items: center; }
        .new-term-field { display: flex; flex-direction: row; align-items: center; gap: 8px; min-width: 320px; }
        .new-term-field label { font-size: 14px; font-weight: 600; color: #e5e7eb; white-space: nowrap; min-width: 90px; text-align: right; }
        .new-term-field-wide { flex: 1 1 0; max-width: 320px; }
        .new-term-control { height: 44px; border-radius: 8px; padding: 0 12px; width: 220px; }
        .new-term-control[type="number"] { width: 220px; max-width: none; }
        .new-term-actions { margin-top: 4px; display: flex; justify-content: flex-end; }
        .new-term-submit { padding: 0 16px; white-space: nowrap; }

        /* Mobile: stack controls full-width for better usability */
        @media (max-width: 640px) {
          .new-term-row { flex-wrap: wrap; }
          .new-term-field, .new-term-field-wide { flex: 1 1 100%; min-width: 0; }
          .new-term-field { flex-direction: column; align-items: flex-start; }
          .new-term-control { width: 100%; }
          .new-term-actions { justify-content: flex-start; }
          .new-term-submit { width: auto; margin-top: 4px; }
        }
      `}</style>

      {loading && <p>Loading terms...</p>}

      {!loading && !error && (
        terms.length === 0 ? (
          <table className="admin-terms-table">
            <tbody>
              <tr>
                <td colSpan={5}>No terms</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="admin-terms-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Name</th>
                <th style={{ width: '20%' }}>Start Date</th>
                <th style={{ width: '20%' }}>End Date</th>
                <th style={{ width: '8%' }}>Active</th>
                <th style={{ width: '34%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...terms]
                .slice()
                .sort((a, b) => {
                  const aMissing = !a.startDate || !a.endDate;
                  const bMissing = !b.startDate || !b.endDate;

                  // 1) Terms with missing dates (Promote & Create Next visible) first
                  if (aMissing && !bMissing) return -1;
                  if (!aMissing && bMissing) return 1;

                  const aActive = !!a.isActive;
                  const bActive = !!b.isActive;

                  // 2) Then active terms
                  if (aActive && !bActive) return -1;
                  if (!aActive && bActive) return 1;

                  // 3) Remaining terms ordered by name: year desc, then SP before FA
                  const parseName = (name) => {
                    if (!name) return { season: null, year: null };
                    const m = name.toLowerCase().match(/^(fa|sp)(\d{2})$/);
                    if (!m) return { season: null, year: null };
                    return { season: m[1], year: parseInt(m[2], 10) };
                  };

                  const aInfo = parseName(a.name);
                  const bInfo = parseName(b.name);

                  if (aInfo.year != null && bInfo.year != null) {
                    if (aInfo.year !== bInfo.year) {
                      return bInfo.year - aInfo.year; // higher year first
                    }
                    if (aInfo.season !== bInfo.season) {
                      // For same year: SP before FA
                      if (aInfo.season === 'sp' && bInfo.season === 'fa') return -1;
                      if (aInfo.season === 'fa' && bInfo.season === 'sp') return 1;
                    }
                    return 0;
                  }

                  // Fallback: keep original relative order by returning 0
                  return 0;
                })
                .map((term) => {
                  const row = rowDates[term._id] || { startDate: '', endDate: '' };
                  const missingDates = !term.startDate || !term.endDate;
                  const canActivate = !missingDates && !term.isActive;
                  return (
                    <tr key={term._id}>
                      <td>
                        <strong>{term.name}</strong>
                        <div className="muted">ID: {term._id}</div>
                      </td>
                      <td>
                        {term.startDate ? (
                          <div>{new Date(term.startDate).toISOString().slice(0, 10)}</div>
                        ) : (
                          <input
                            className="term-input"
                            type="date"
                            value={row.startDate}
                            onChange={(e) =>
                              handleRowDateChange(term._id, 'startDate', e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td>
                        {term.endDate ? (
                          <div>{new Date(term.endDate).toISOString().slice(0, 10)}</div>
                        ) : (
                          <input
                            className="term-input"
                            type="date"
                            value={row.endDate}
                            onChange={(e) =>
                              handleRowDateChange(term._id, 'endDate', e.target.value)
                            }
                          />
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {term.isActive ? (
                          <span style={{ color: 'green', fontWeight: 600 }}>Yes</span>
                        ) : (
                          'No'
                        )}
                      </td>
                      <td>
                        {/* Show Promote button only for rows that have date input(s)
                          (i.e. terms missing start or end date), matching EJS.
                          Additionally, disable it until both dates are filled to avoid
                          backend validation errors. */}
                        {missingDates && (
                          <div className="term-actions">
                            <button
                              type="button"
                              className="small-btn"
                              onClick={() => handlePromote(term._id)}
                              disabled={
                                loading || !row.startDate || !row.endDate
                              }
                            >
                              Promote &amp; Create Next
                            </button>
                          </div>
                        )}
                        {!missingDates && canActivate && (
                          <div className="term-actions" style={{ marginTop: 4 }}>
                            <button
                              type="button"
                              className="small-btn"
                              onClick={() => handleActivate(term._id)}
                              disabled={loading}
                            >
                              Activate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
