import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

export default function AdminUserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    degreeShort: '',
    rollNumber: '',
    intake: '',
    semesterNumber: '',
    section: '',
    cgpa: '',
    phone: '',
    role: 'student',
    password: '',
    isActive: true
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    async function loadUser() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest(`/api/admin/users/${id}`);
        const u = res && res.data && res.data.user;
        if (!u || cancelled) return;
        setForm({
          email: u.email || '',
          firstName: (u.name && u.name.first) || '',
          lastName: (u.name && u.name.last) || '',
          degreeShort: u.degreeShort || '',
          rollNumber: u.rollNumber || '',
          intake: u.intake ? (u.intake.season + (u.intake.year ? String(u.intake.year).slice(-2) : '')) : '',
          semesterNumber: u.semesterNumber || '',
          section: u.section || '',
          cgpa: u.cgpa || '',
          phone: u.phone || '',
          role: u.role || 'student',
          password: '',
          isActive: !!u.isActive
        });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load user');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { ...form };
      // backend expects isActive present or absent; we send boolean
      body.isActive = form.isActive;

      if (isEdit) {
        await apiRequest(`/api/admin/users/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        await apiRequest('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      navigate('/admin/users');
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h1>{isEdit ? 'Edit User' : 'Create User'}</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <div className="form-row">
            <label>Email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>First name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Last name</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Degree short (e.g. bse)</label>
            <input name="degreeShort" value={form.degreeShort} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Roll number (e.g. 031)</label>
            <input name="rollNumber" value={form.rollNumber} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Intake season-year (optional, e.g. fa22)</label>
            <input name="intake" value={form.intake} onChange={handleChange} placeholder="fa22 or sp22" />
          </div>

          <div className="form-row">
            <label>Semester Number</label>
            <input name="semesterNumber" type="number" min="1" max="12" value={form.semesterNumber} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Section</label>
            <input name="section" value={form.section} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>CGPA</label>
            <input name="cgpa" type="number" step="0.01" min="0" max="4" value={form.cgpa} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-row">
            <label>Password {isEdit ? '(leave blank to keep)' : ''}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} />
          </div>

          <div className="form-row">
            <label>
              <input
                name="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={handleChange}
              />{' '}
              Active
            </label>
          </div>

          <div className="form-row">
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
