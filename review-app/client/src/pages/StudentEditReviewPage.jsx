import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

export default function StudentEditReviewPage() {
  const { ratingId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(null);

  const [overallRating, setOverallRating] = useState('');
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest(`/api/ratings/item/${ratingId}`);
        if (cancelled) return;
        const data = res && res.data ? res.data : null;
        setRating(data);
        if (data) {
          setOverallRating(data.overallRating ?? '');
          setObtainedMarks(data.obtainedMarks ?? '');
          setComment(data.comment ?? '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load rating');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ratingId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const r = parseInt(overallRating, 10);
    if (!r || r < 1 || r > 5) {
      setError('Overall rating must be between 1 and 5.');
      return;
    }
    if (obtainedMarks === '') {
      setError('Obtained marks are required.');
      return;
    }

    try {
      setSaving(true);
      await apiRequest(`/ratings/${ratingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating: r,
          obtainedMarks,
          comment,
        }),
      });
      navigate('/dashboard/ratings');
    } catch (e) {
      setError(e.message || 'Failed to update rating');
    } finally {
      setSaving(false);
    }
  };

  const offeringLabel = (() => {
    if (!rating || !rating.offering) return '';
    const t = rating.offering.teacher;
    const c = rating.offering.course;
    const teacherName = t
      ? t.name
        ? `${t.name.first || ''}${t.name.last ? ' ' + t.name.last : ''}`.trim()
        : t.email || 'TBD'
      : 'TBD';
    const courseLabel = c ? `${c.code ? c.code + ' - ' : ''}${c.title || c.name || ''}`.trim() : '';
    return `${teacherName}${courseLabel ? ' — ' + courseLabel : ''}`;
  })();

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-star-half-stroke"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Edit Review
      </h1>

      {rating && (
        <p className="muted" style={{ marginTop: 4 }}>
          {offeringLabel}
        </p>
      )}

      {loading && <p className="muted" style={{ marginTop: 8 }}>Loading rating…</p>}
      {error && !loading && (
        <div className="response" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      {!loading && !error && rating && (
        <form onSubmit={onSubmit} style={{ marginTop: 12, maxWidth: 480 }}>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <label>
              Overall Rating (1-5)
              <input
                type="number"
                min="1"
                max="5"
                value={overallRating}
                onChange={(e) => setOverallRating(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-row" style={{ marginBottom: 8 }}>
            <label>
              Obtained Marks
              <input
                type="number"
                value={obtainedMarks}
                onChange={(e) => setObtainedMarks(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-row" style={{ marginBottom: 8 }}>
            <label>
              Comment (optional)
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </label>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}
