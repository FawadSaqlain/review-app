import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../lib/api.js';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    usersTotal: 0,
    ratingsTotal: 0,
    avgOverall: 0,
    avgMarks: 0,
    offeringsTotal: 0,
    termsTotal: 0,
    termsActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trend, setTrend] = useState([]); // last 7 days ratings trend

  const chartRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [usersRes, ratingsRes, offeringsRes, termsRes] = await Promise.all([
          apiRequest('/api/admin/users?page=1'),
          apiRequest('/api/ratings?page=1&limit=200&sort=createdAt&order=desc'),
          apiRequest('/api/admin/offerings'),
          apiRequest('/api/admin/terms')
        ]);

        if (cancelled) return;

        const usersData = usersRes && usersRes.data ? usersRes.data : {};
        const ratingsData = ratingsRes && ratingsRes.data ? ratingsRes.data : {};
        const offeringsData = offeringsRes && offeringsRes.data ? offeringsRes.data : {};
        const termsData = termsRes && termsRes.data ? termsRes.data : {};

        const usersTotal = usersData.total || (usersData.users ? usersData.users.length : 0) || 0;
        const ratingsTotal = ratingsData.total || (ratingsData.items ? ratingsData.items.length : 0) || 0;
        const aggregates = ratingsData.aggregates || {};

        const ratingItems = ratingsData.items || [];

        // Build last 7 days trend from rating createdAt timestamps
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayLabels = [];
        const countsByDate = new Map();

        for (let i = 6; i >= 0; i -= 1) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
          dayLabels.push({ key, label });
          countsByDate.set(key, 0);
        }

        ratingItems.forEach((r) => {
          if (!r.createdAt) return;
          const d = new Date(r.createdAt);
          d.setHours(0, 0, 0, 0);
          const key = d.toISOString().slice(0, 10);
          if (countsByDate.has(key)) {
            countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
          }
        });

        const trendData = dayLabels.map(({ key, label }) => ({ label, count: countsByDate.get(key) || 0 }));

        const offeringsTotal = (offeringsData.offerings || []).length;
        const terms = termsData.terms || [];
        const termsTotal = terms.length;
        const termsActive = terms.filter((t) => t.isActive).length;

        setStats({
          usersTotal,
          ratingsTotal,
          avgOverall: Number(aggregates.avgOverall || 0),
          avgMarks: Number(aggregates.avgMarks || 0),
          offeringsTotal,
          termsTotal,
          termsActive
        });
        setTrend(trendData);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxActivity = Math.max(stats.usersTotal, stats.ratingsTotal, stats.offeringsTotal, 1);

  const barWidth = (value) => `${Math.max(5, (value / maxActivity) * 100)}%`;

  useEffect(() => {
    if (!canvasRef.current || trend.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.map((t) => t.label),
        datasets: [
          {
            label: 'Ratings per day',
            data: trend.map((t) => t.count),
            borderColor: '#facc15',
            backgroundColor: 'rgba(250,204,21,0.15)',
            tension: 0.25,
            fill: false,
            pointRadius: 3,
            pointBackgroundColor: '#facc15'
          }
        ]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false, mode: 'index' }
        },
        scales: {
          x: {
            display: true,
            ticks: { color: '#9ca3af', font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#9ca3af', font: { size: 10 } },
            grid: { color: '#1f2937' }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [trend]);

  return (
    <div className="card">
      <h1>
        <i className="fa-solid fa-chart-column" style={{ marginRight: 8, color: 'var(--primary)' }} />
        Admin Analytics Dashboard
      </h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        High-level overview of how CVUR Portal is being used in real time: student accounts, ratings activity,
        and academic data for current and past terms.
      </p>

      {error && <div className="response">{error}</div>}
      {loading && !error && <p className="muted">Loading dashboard…</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              gap: 16,
              marginBottom: 20
            }}
          >
            <div className="card" style={{ marginBottom: 0 }}>
              <h3>Students</h3>
              <p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.usersTotal}</p>
              <p className="muted" style={{ marginTop: 4 }}>Total registered users</p>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3>Ratings Submitted</h3>
              <p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.ratingsTotal}</p>
              <p className="muted" style={{ marginTop: 4 }}>Total reviews captured in the system</p>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3>Average Overall Rating</h3>
              <p style={{ fontSize: '1.8rem', margin: 0 }}>{stats.avgOverall.toFixed(2)}</p>
              <p className="muted" style={{ marginTop: 4 }}>Across all courses & offerings</p>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3>Academic Data</h3>
              <p style={{ margin: 0 }}>
                <strong>{stats.offeringsTotal}</strong> offerings
              </p>
              <p style={{ margin: 0 }}>
                <strong>{stats.termsActive}</strong> active / <strong>{stats.termsTotal}</strong> terms
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Ratings over last 7 days</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              Line chart of daily ratings submitted. This helps you see recent engagement trends.
            </p>
            <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
              <canvas ref={canvasRef} height={140} />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginTop: 0 }}>Activity snapshot</h2>
            <p className="muted" style={{ marginBottom: 12 }}>
              Relative activity across key areas. Each tile shows the total and a range line scaled to the busiest area.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  flex: '1 1 180px',
                  borderRadius: 12,
                  padding: 10,
                  background: '#020617'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-user-graduate" style={{ marginRight: 6, color: 'var(--primary)' }} />
                    Students
                  </span>
                  <span style={{ fontWeight: 600 }}>{stats.usersTotal}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: '#020617', borderRadius: 999 }}>
                    <div
                      style={{
                        height: 6,
                        width: barWidth(stats.usersTotal),
                        borderRadius: 999,
                        background: 'linear-gradient(90deg,#facc15,#eab308)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: 2 }}>
                    <span>0</span>
                    <span>{maxActivity}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1 1 180px',
                  borderRadius: 12,
                  padding: 10,
                  background: '#020617'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-star-half-stroke" style={{ marginRight: 6, color: 'var(--primary)' }} />
                    Ratings
                  </span>
                  <span style={{ fontWeight: 600 }}>{stats.ratingsTotal}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: '#020617', borderRadius: 999 }}>
                    <div
                      style={{
                        height: 6,
                        width: barWidth(stats.ratingsTotal),
                        borderRadius: 999,
                        background: 'linear-gradient(90deg,#facc15,#eab308)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: 2 }}>
                    <span>0</span>
                    <span>{maxActivity}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: '1 1 180px',
                  borderRadius: 12,
                  padding: 10,
                  background: '#020617'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-list-check" style={{ marginRight: 6, color: 'var(--primary)' }} />
                    Offerings
                  </span>
                  <span style={{ fontWeight: 600 }}>{stats.offeringsTotal}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <div style={{ background: '#020617', borderRadius: 999 }}>
                    <div
                      style={{
                        height: 6,
                        width: barWidth(stats.offeringsTotal),
                        borderRadius: 999,
                        background: 'linear-gradient(90deg,#facc15,#eab308)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: 2 }}>
                    <span>0</span>
                    <span>{maxActivity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="links">
            <Link to="/admin/ratings">View Ratings Summaries</Link>
          </div>
        </>
      )}
    </div>
  );
}
