import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../../lib/api';

export default function AdminOfferingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offering, setOffering] = useState(null);
  const [terms, setTerms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  const [courseTitle, setCourseTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [section, setSection] = useState('');
  const [termId, setTermId] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest(`/api/admin/offerings/${id}`);
        const data = res && res.data ? res.data : {};
        const off = data.offering;
        if (!off) throw new Error('Offering not found');
        if (cancelled) return;
        setOffering(off);
        setTerms(data.terms || []);
        setDepartments(data.departments || []);
        setPrograms(data.programs || []);
        setCourseTitle(
          (off.course && off.course.title) ? off.course.title : ''
        );
        setDepartmentId(
          off.department && off.department._id ? off.department._id : ''
        );
        setProgramId(off.program && off.program._id ? off.program._id : '');
        setSemesterNumber(off.semesterNumber || '');
        setSection(off.section || '');
        setTermId(off.term && off.term._id ? off.term._id : '');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load offering');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offering) return;
    try {
      setError(null);
      await apiRequest(`/api/admin/offerings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: offering.course && offering.course._id,
          courseTitle,
          department: departmentId || undefined,
          program: programId || undefined,
          semesterNumber,
          section,
          term: termId || undefined,
        }),
      });
      navigate('/admin/offerings');
    } catch (err) {
      setError(err.message || 'Failed to save offering');
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p>Loading offering...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!offering) {
    return (
      <div className="card">
        <p>Offering not found.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-pen-to-square"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Edit Offering
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Course Code</label>
          <input
            readOnly
            value={
              offering.course && offering.course.code ? offering.course.code : ''
            }
          />
        </div>
        <div className="form-row">
          <label htmlFor="courseTitle">Course Title</label>
          <input
            id="courseTitle"
            name="courseTitle"
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
          />
        </div>
        <div className="form-row form-row-inline">
          <div className="field">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              name="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">-- Select Dept --</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="program">Program</label>
            <select
              id="program"
              name="program"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
            >
              <option value="">-- Select Program --</option>
              {programs.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row form-row-inline">
          <div className="field">
            <label htmlFor="semesterNumber">Semester Number</label>
            <input
              id="semesterNumber"
              name="semesterNumber"
              type="number"
              min="1"
              max="12"
              value={semesterNumber}
              onChange={(e) => setSemesterNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="section">Section</label>
            <input
              id="section"
              name="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="term">Term</label>
            <select
              id="term"
              name="term"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">-- Select Term --</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isActive ? '(active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <button type="submit">Save</button>
          <button
            type="button"
            onClick={() => navigate('/admin/offerings')}
            style={{ marginLeft: 8 }}
          >
            Back to list
          </button>
        </div>
      </form>
    </div>
  );
}
