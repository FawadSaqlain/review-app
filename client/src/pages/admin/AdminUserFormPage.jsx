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
      const emailPattern = /^(?:fa|sp)\d{2}-(?:baf|bag|bba|bcs|bec|bed|ben|bes|bmd|bse|bsm|bty)-\d{3}@cuivehari\.edu\.pk$/i;
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;

      const emailTrimmed = form.email.trim();
      if (!emailPattern.test(emailTrimmed)) {
        setError('Email must be a valid CUI Vehari student address like fa22-bse-031@cuivehari.edu.pk.');
        setSaving(false);
        return;
      }

      if (!form.degreeShort || !/^(?:baf|bag|bba|bcs|bec|bed|ben|bes|bmd|bse|bsm|bty)$/i.test(form.degreeShort.trim())) {
        setError('Degree short must be one of: baf, bag, bba, bcs, bec, bed, ben, bes, bmd, bse, bsm, bty.');
        setSaving(false);
        return;
      }

      if (!/^[0-9]{3}$/.test(String(form.rollNumber).trim())) {
        setError('Roll number must be a 3-digit number, e.g. 031.');
        setSaving(false);
        return;
      }

      if (form.intake) {
        if (!/^(?:fa|sp)\d{2}$/i.test(form.intake.trim())) {
          setError('Intake must be like fa22 or sp22 (optional).');
          setSaving(false);
          return;
        }
      }

      if (form.semesterNumber) {
        const sem = Number(form.semesterNumber);
        if (Number.isNaN(sem) || sem < 1 || sem > 12) {
          setError('Semester number must be between 1 and 12.');
          setSaving(false);
          return;
        }
      }

      if (form.section) {
        if (!/^[A-Za-z]$/.test(form.section.trim())) {
          setError('Section must be a single alphabet letter (e.g., A, B, C).');
          setSaving(false);
          return;
        }
      }

      if (form.cgpa !== '' && form.cgpa !== null && typeof form.cgpa !== 'undefined') {
        const g = Number(form.cgpa);
        if (Number.isNaN(g) || g < 0 || g > 4) {
          setError('CGPA must be a number between 0 and 4.');
          setSaving(false);
          return;
        }
      }

      if (form.phone) {
        const phoneTrimmed = form.phone.trim();
        if (!/^\+92\d{10}$/.test(phoneTrimmed)) {
          setError('Phone must be 13 characters starting with +92 followed by 10 digits, e.g., +923001234567.');
          setSaving(false);
          return;
        }
      }

      // Password is optional on edit; if provided, enforce strength
      if (form.password && !passwordPattern.test(form.password)) {
        setError('Password must be 8-16 characters and include uppercase, lowercase, number, and special character.');
        setSaving(false);
        return;
      }

      const body = { ...form };
      body.email = emailTrimmed;
      // backend expects isActive present or absent; we send boolean
      body.isActive = form.isActive;
      // Only student users are managed via this UI
      body.role = 'student';

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

          <div className="form-row form-row-inline">
            <div className="field">
              <label>Email</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Name</label>
              <input
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row form-row-inline">
            <div className="field">
              <label>Intake season-year (optional, e.g. fa22)</label>
              <input
                name="intake"
                type="text"
                value={form.intake}
                onChange={handleChange}
                placeholder="fa22 or sp22"
              />
            </div>
            <div className="field">
              <label>Degree short (e.g. bse)</label>
              <input
                name="degreeShort"
                type="text"
                value={form.degreeShort}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Roll number (e.g. 031)</label>
              <input
                name="rollNumber"
                type="text"
                value={form.rollNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row form-row-inline">
            <div className="field">
              <label>Semester Number</label>
              <input
                name="semesterNumber"
                type="number"
                min="1"
                max="12"
                value={form.semesterNumber}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>Section</label>
              <input
                name="section"
                type="text"
                value={form.section}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>CGPA</label>
              <input
                name="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.cgpa}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row form-row-inline">
            <div className="field">
              <label>Phone</label>
              <input
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label>
                Password {isEdit ? '(leave blank to keep)' : ''}
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <div className="field" style={{ alignSelf: 'center' }}>
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
          </div>

          <div className="form-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
