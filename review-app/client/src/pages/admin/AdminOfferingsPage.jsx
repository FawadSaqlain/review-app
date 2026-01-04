import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

function formatTeacher(teacher) {
  if (!teacher || !teacher.name) return '-';
  const first = teacher.name.first || '';
  const last = teacher.name.last || '';
  const full = `${first} ${last}`.trim();
  return full || '-';
}

export default function AdminOfferingsPage() {
  const [terms, setTerms] = useState([]);
  const [currentTermId, setCurrentTermId] = useState('');
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load(termId) {
    setLoading(true);
    setError(null);
    try {
      const query = termId ? `?term=${encodeURIComponent(termId)}` : '';
      const res = await apiRequest(`/api/admin/offerings${query}`);
      const data = res && res.data ? res.data : {};
      setTerms(data.terms || []);
      setOfferings(data.offerings || []);
      const current = data.currentTerm || null;
      setCurrentTermId(current && current._id ? current._id : (termId || ''));
    } catch (err) {
      setError(err.message || 'Failed to load offerings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTermChange = (e) => {
    const termId = e.target.value;
    setCurrentTermId(termId);
    load(termId);
  };

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-list-check"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Offerings by Term
      </h1>

      {error && <p className="error">{error}</p>}

      <form
        className="filters"
        style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="termSelect">Term:</label>
        <select
          id="termSelect"
          name="term"
          value={currentTermId}
          onChange={handleTermChange}
        >
          <option value="">-- All / Active --</option>
          {terms.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} {t.isActive ? '(active)' : ''}
            </option>
          ))}
        </select>
        <button type="submit">Filter</button>

        <div style={{ marginLeft: 'auto' }}>
          <Link to="/admin/class/add" className="btn btn-primary" title="Add class or bulk upload" aria-label="Add class or bulk upload">
            <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />
            Add Class / Bulk Upload
          </Link>
        </div>
      </form>

      {loading && <p>Loading offerings...</p>}

      {!loading && !error && (
        offerings.length === 0 ? (
          <p style={{ marginTop: 12 }}>No offerings for this term.</p>
        ) : (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Teacher</th>
                <th>Dept</th>
                <th>Program</th>
                <th>Sem</th>
                <th>Section</th>
                <th>Term</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map((off) => (
                <tr key={off._id}>
                  <td>{off.course && off.course.code ? off.course.code : '—'}</td>
                  <td>{off.course && off.course.title ? off.course.title : '—'}</td>
                  <td>{formatTeacher(off.teacher)}</td>
                  <td>{off.department && off.department.name ? off.department.name : '—'}</td>
                  <td>{off.program && off.program.name ? off.program.name : '—'}</td>
                  <td>{off.semesterNumber || '—'}</td>
                  <td>{off.section || '—'}</td>
                  <td>{off.term && off.term.name ? off.term.name : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link
                        to={`/admin/offerings/${off._id}/edit`}
                        title="Edit offering"
                        aria-label="Edit offering"
                      >
                        <i className="fa-solid fa-pen" style={{ color: 'var(--primary)', fontSize: '1rem' }} />
                      </Link>
                      <button
                        type="button"
                        title="Delete offering"
                        aria-label="Delete offering"
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        onClick={async () => {
                          try {
                            if (!window.confirm('Delete offering?')) return;
                            await apiRequest(`/api/admin/offerings/${off._id}`, {
                              method: 'DELETE',
                              headers: { Accept: 'application/json' },
                            });
                            load(currentTermId);
                          } catch (err) {
                            alert(err.message || 'Delete failed');
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash" style={{ color: 'var(--primary)', fontSize: '1rem' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
