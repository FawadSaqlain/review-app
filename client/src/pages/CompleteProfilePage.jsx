import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { completeProfile, fetchMe } from '../features/auth/authSlice.js';

export default function CompleteProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, status, error } = useSelector((s) => s.auth);

  const showCgpa = useMemo(() => {
    const sem = user?.semesterNumber;
    return !!(sem && sem > 1);
  }, [user?.semesterNumber]);

  const [section, setSection] = useState('');
  const [phone, setPhone] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [idCard, setIdCard] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setSection(user.section || '');
      setPhone(user.phone || '');
      setCgpa(typeof user.cgpa !== 'undefined' && user.cgpa !== null ? String(user.cgpa) : '');
    }
  }, [user]);

  const onFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setMessage('');

    if (file && file.size > 1024 * 1024) {
      setMessage('ID card image must be at most 1MB.');
      e.target.value = '';
      setIdCard(null);
      return;
    }

    setIdCard(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const sectionTrimmed = section.trim();
    const phoneTrimmed = phone.trim();

    if (!sectionTrimmed || !/^[A-Za-z]$/.test(sectionTrimmed)) {
      setMessage('Section must be a single alphabet letter (e.g., A, B, C).');
      return;
    }

    if (!/^\+92\d{10}$/.test(phoneTrimmed)) {
      setMessage('Phone must start with +92 followed by 10 digits, e.g., +923001234567.');
      return;
    }

    if (showCgpa && cgpa) {
      const g = Number(cgpa);
      if (Number.isNaN(g) || g < 0 || g > 4) {
        setMessage('CGPA must be a number between 0 and 4.');
        return;
      }
    }

    const fd = new FormData();
    fd.append('section', sectionTrimmed);
    fd.append('phone', phoneTrimmed);
    if (showCgpa && cgpa) fd.append('cgpa', cgpa);
    if (idCard) fd.append('idCard', idCard); // backend expects `idCard`

    const action = await dispatch(completeProfile(fd));
    if (completeProfile.fulfilled.match(action)) {
      setMessage(action.payload?.data?.message || 'Profile updated');
      await dispatch(fetchMe());
      navigate('/profile', { replace: true });
    }
  };

  return (
    <div className="card">
      <h2>Complete Profile</h2>
      <p className="muted">Add section, phone and (if applicable) CGPA. You can also upload your university ID card.</p>

      <form onSubmit={onSubmit} encType="multipart/form-data">
        <div className="form-row">
          <label>Section</label>
          <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., A" />
        </div>

        <div className="form-row">
          <label>Phone</label>
          <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +923001234567" />
        </div>

        {showCgpa && (
          <div className="form-row">
            <label>CGPA</label>
            <input type="number" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g., 3.45" />
          </div>
        )}

        <div className="form-row">
          <label>University ID Card (image, max 1MB)</label>
          <div className="file-input-wrapper">
            <label className="file-input-label">
              <i className="fa-regular fa-id-card" aria-hidden="true" />
              Choose file
              <input
                type="file"
                accept="image/*"
                className="file-input"
                onChange={onFileChange}
              />
            </label>
            {idCard && (
              <span className="file-input-name">{idCard.name}</span>
            )}
          </div>
        </div>

        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {(error || message) && <div className="response">{error || message}</div>}
    </div>
  );
}
