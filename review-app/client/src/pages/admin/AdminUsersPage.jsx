import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

function formatName(user) {
  if (!user || !user.name) return '-';
  const first = user.name.first || '';
  const last = user.name.last || '';
  const full = `${first} ${last}`.trim();
  return full || '-';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load(nextPage = 1, query = '') {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      params.set('page', String(nextPage));
      const res = await apiRequest(`/api/admin/users?${params.toString()}`);
      const data = res && res.data ? res.data : {};
      setUsers(data.users || []);
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(1, q);
  };

  const canPrev = page > 1;
  const canNext = users.length > 0 && users.length === 50; // page size

  return (
    <div className="card">
      <h1>Admin Users</h1>

      <p><Link to="/admin/users/new">Create new user</Link></p>

      <form className="form-inline" onSubmit={handleSearchSubmit}>
        <div className="form-group">
          <input
            type="text"
            className="form-control"
            placeholder="Search by email or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>Search</button>
      </form>

      {loading && <p>Loading users...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Active</th>
                  <th>Degree</th>
                  <th>Roll #</th>
                  <th>Semester</th>
                  <th>Section</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.email}</td>
                    <td>{formatName(u)}</td>
                    <td>{u.role}</td>
                    <td>{u.isActive ? 'Yes' : 'No'}</td>
                    <td>{u.degreeShort || '-'}</td>
                    <td>{u.rollNumber || '-'}</td>
                    <td>{u.semesterNumber || '-'}</td>
                    <td>{u.section || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          to={`/admin/users/${u._id}/edit`}
                          title="Edit user"
                          aria-label="Edit user"
                        >
                          <i className="fa-solid fa-pen" style={{ color: 'var(--primary)', fontSize: '1rem' }} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-link"
                          title="Delete user"
                          aria-label="Delete user"
                          style={{ background: 'transparent', border: 'none', padding: 0 }}
                          onClick={async () => {
                          if (!window.confirm('Delete user?')) return;
                            try {
                              await apiRequest(`/api/admin/users/${u._id}`, { method: 'DELETE' });
                              load(page, q);
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
            </div>

            <div className="pagination">
              <button className="btn btn-default" disabled={!canPrev || loading} onClick={() => load(page - 1, q)}>Previous</button>
              <span style={{ margin: '0 10px' }}>Page {page}</span>
              <button className="btn btn-default" disabled={!canNext || loading} onClick={() => load(page + 1, q)}>Next</button>
            </div>

            <p>Total users: {total}</p>
          </>
        )
      )}
    </div>
  );
}
