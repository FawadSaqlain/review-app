import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

export default function StudentGiveReviewFormPage() {
  const { offeringId } = useParams();
  const navigate = useNavigate();

  const [overallRating, setOverallRating] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [obtainedMarks, setObtainedMarks] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const rating = parseInt(overallRating, 10);
    if (!rating || rating < 1 || rating > 5) {
      setError('Overall rating must be between 1 and 5.');
      return;
    }
    if (obtainedMarks === '') {
      setError('Obtained marks are required.');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offering: offeringId,
          overallRating: rating,
          obtainedMarks,
          comment,
        }),
      });
      setMessage('Rating submitted.');
      // After submit, send user to My Reviews
      navigate('/dashboard/ratings');
    } catch (e) {
      setError(e.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>
        <i
          className="fa-solid fa-star-half-stroke"
          style={{ marginRight: 8, color: 'var(--primary)' }}
        />
        Give Review
      </h1>

      {error && (
        <div className="response" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
      {message && !error && (
        <div className="response" style={{ marginTop: 8 }}>
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 12, maxWidth: 480 }}>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <label>
            Overall Rating (1-5)
            <div className="star-picker" style={{ marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const activeValue = hoverRating || parseInt(overallRating || 0, 10) || 0;
                const filled = star <= activeValue;
                return (
                  <span
                    key={star}
                    className={`star${filled ? ' filled' : ''}`}
                    onClick={() => setOverallRating(String(star))}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    ☆
                  </span>
                );
              })}
            </div>
          </label>
        </div>

        <div className="form-row" style={{ marginBottom: 8 }}>
          <label>
            Obtained Marks
            <input
              type="number"
              max={100}
              min={0}
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

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}
