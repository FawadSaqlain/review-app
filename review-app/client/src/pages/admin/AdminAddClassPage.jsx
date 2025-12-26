import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

const deptPrograms = {
  'Computer Science': [
    'Bachelor of Science in Computer Science: BS (CS)',
    'Bachelor of Software Engineering',
  ],
  'Environmental Sciences': ['BS in Environmental Sciences', 'BS in Agriculture'],
  'Management Sciences': [
    'Bachelor of Science in Business Administration BS(BA)',
    'Bachelor of Science in Accounting and Finance',
  ],
  Humanities: ['Bachelor of Science in English BS(ENG)'],
  Mathematics: [
    'Bachelor of Science in Mathematics with Data Science',
    'Bachelor of Science in Mathematics',
  ],
  Economics: [
    'Bachelor of Science in Economics with Data Science',
    'Bachelor of Science in Economics: BS (Eco)',
  ],
  Biotechnology: ['BS in Biotechnology'],
};

export default function AdminAddClassPage() {
  const [department, setDepartment] = useState('');
  const [program, setProgram] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [section, setSection] = useState('');
  const [subjects, setSubjects] = useState([
    { code: '', title: '', teacherName: '' },
  ]);
  const [terms, setTerms] = useState([]);
  const [uploadTermId, setUploadTermId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResult, setUploadResult] = useState('');
  const [loadingUpload, setLoadingUpload] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiRequest('/api/admin/terms')
      .then((res) => {
        if (cancelled) return;
        const list = (res && res.data && res.data.terms) || [];
        setTerms(list);
        const active = list.find((t) => t.isActive);
        if (active) setUploadTermId(active._id);
      })
      .catch(() => {
        if (!cancelled) setTerms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeptChange = (value) => {
    setDepartment(value);
    setProgram('');
  };

  const handleSubjectChange = (index, field, value) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addSubjectRow = () => {
    setSubjects((prev) => [...prev, { code: '', title: '', teacherName: '' }]);
  };

  const removeSubjectRow = (index) => {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      department,
      program,
      semesterNumber,
      section,
      subjects,
    };
    try {
      const res = await apiRequest('/api/admin/class/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = res && res.data ? res.data : null;
      if (json && json.success !== false) {
        alert('Classes added');
        setSemesterNumber('');
        setSection('');
        setSubjects([{ code: '', title: '', teacherName: '' }]);
      } else {
        const msg =
          (json && json.error && json.error.message) || 'Error adding classes';
        alert(`Error: ${msg}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file');
      return;
    }
    const fd = new FormData();
    fd.append('file', uploadFile);
    if (uploadTermId) fd.append('term', uploadTermId);
    setLoadingUpload(true);
    setUploadResult('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/class/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const text = await res.text();
      let j = null;
      try {
        j = JSON.parse(text);
      } catch {
        j = null;
      }
      if (j && j.success) {
        const created =
          j.data && j.data.createdOfferings ? j.data.createdOfferings : 0;
        setUploadResult(
          `Upload succeeded. ${created ? created + ' offerings created.' : ''}`,
        );
      } else if (j && j.error) {
        setUploadResult(
          `Upload failed: ${
            (j.error && j.error.message) || JSON.stringify(j.error)
          }`,
        );
      } else {
        setUploadResult(`Upload failed (non-JSON response): ${text.slice(0, 200)}`);
      }
    } catch (err) {
      setUploadResult(`Network error: ${err.message}`);
    } finally {
      setLoadingUpload(false);
    }
  };

  const programOptions = department ? deptPrograms[department] || [] : [];

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-chalkboard-user"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Admin  Add Class Manually
      </h1>

      <form id="addClassForm" onSubmit={handleManualSubmit}>
        <div className="form-row">
          <label htmlFor="department">Department</label>
          <select
            id="department"
            name="department"
            value={department}
            onChange={(e) => handleDeptChange(e.target.value)}
            required
          >
            <option value="">-- Select Department --</option>
            {Object.keys(deptPrograms).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="program">Program / Degree</label>
          <select
            id="program"
            name="program"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            required
          >
            <option value="">-- Select Program --</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="semesterNumber">Semester Number</label>
          <input
            id="semesterNumber"
            name="semesterNumber"
            type="number"
            min="1"
            max="12"
            value={semesterNumber}
            onChange={(e) => setSemesterNumber(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <label htmlFor="section">Section (optional)</label>
          <input
            id="section"
            name="section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
        </div>

        <h3>Subjects</h3>
        <div id="subjectsContainer">
          {subjects.map((s, idx) => (
            <div key={idx} className="subject-row">
              <input
                name="sub_code"
                placeholder="Course Code"
                value={s.code}
                onChange={(e) => handleSubjectChange(idx, 'code', e.target.value)}
                required
              />
              <input
                name="sub_title"
                placeholder="Course Title"
                value={s.title}
                onChange={(e) => handleSubjectChange(idx, 'title', e.target.value)}
              />
              <input
                name="sub_teacher"
                placeholder="Teacher Name"
                value={s.teacherName}
                onChange={(e) =>
                  handleSubjectChange(idx, 'teacherName', e.target.value)
                }
                required
              />
              {subjects.length > 1 && (
                <button
                  type="button"
                  className="remove-row"
                  onClick={() => removeSubjectRow(idx)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <div>
          <button id="addRowBtn" type="button" onClick={addSubjectRow}>
            Add subject
          </button>
        </div>

        <div>
          <button type="submit">Add Class(es)</button>
        </div>
      </form>

      <hr />

      <h3>Or upload .xlsx (bulk)</h3>
      <div className="card">
        <form id="uploadForm" onSubmit={handleUploadSubmit}>
          <div className="form-row">
            <label htmlFor="file">Choose .xlsx file</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files && e.target.files[0])}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="uploadTerm">Term (optional)</label>
            <select
              id="uploadTerm"
              name="term"
              value={uploadTermId}
              onChange={(e) => setUploadTermId(e.target.value)}
            >
              <option value="">-- Use active term --</option>
              {terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isActive ? '(active)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <button type="submit" disabled={loadingUpload}>
              {loadingUpload ? 'Uploading…' : 'Upload and Add Classes'}
            </button>
          </div>
          {uploadResult && (
            <div id="uploadResult" className="response">
              {uploadResult}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
