import { Link } from 'react-router-dom';

export default function HomePage() {
  const featureItems = [
    {
      icon: 'fa-user-group',
      title: 'Real student feedback',
      text:
        'See honest ratings and short reviews from seniors before you select courses or teachers.',
    },
    {
      icon: 'fa-scale-balanced',
      title: 'Know difficulty & workload',
      text: 'Understand past difficulty, assessment style and workload to avoid bad surprises.',
    },
    {
      icon: 'fa-shield-heart',
      title: 'Anonymous but constructive',
      text: 'Share your experience safely so juniors benefit from your semester.',
    },
  ];

  const steps = [
    'Sign up with your COMSATS Vehari email and verify your account.',
    'Complete your profile and review courses you have taken.',
    'Use summaries and trends to plan your next semester intelligently.',
  ];

  return (
    <>
      {/* HERO SECTION */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background:
            'radial-gradient(circle at top left, rgba(250,204,21,0.12), transparent 55%), radial-gradient(circle at bottom right, rgba(56,189,248,0.12), transparent 55%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 28,
            alignItems: 'stretch',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <h1
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
                marginTop: 0,
                marginBottom: 10,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  }}
                >
                  <img
                    src="/Remove background project.png"
                    alt="CVUR Portal Logo"
                    style={{ height: 45, width: 90, objectFit: 'contain' }}
                  />
                </span>
                <span style={{ width: '200px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  CVUR Portal
                </span>
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginTop: 2,
                }}
              >
                COMSATS Vehari • Unofficial Reviews
              </span>
            </h1>

            <h2
              style={{
                fontSize: '1.7rem',
                margin: '4px 0 10px',
                maxWidth: 640,
                lineHeight: 1.35,
              }}
            >
              Make smarter course choices with
              <span style={{ color: 'var(--primary)', marginLeft: 6 }}>
                real student ratings.
              </span>
            </h2>

            <p className="muted" style={{ maxWidth: 640, marginBottom: 14 }}>
              CVUR Portal lets COMSATS Vehari students quickly browse how previous batches rated
              courses and instructors – so you can balance GPA, workload and interest before you
              lock in your timetable.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <Link to="/signup" className="btn btn-primary">
                Get Started
              </Link>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                fontSize: '0.9rem',
                color: 'var(--muted)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-star" style={{ color: '#fbbf24' }} />
                <strong>4.7</strong>
                <span>avg. satisfaction</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className="fa-solid fa-user-graduate" style={{ color: 'var(--primary)' }} />
                <span>Built for CVUR students</span>
              </span>
            </div>
          </div>

          {/* Right side: decorative preview */}
          <div
            style={{
              flex: '1 1 280px',
              minWidth: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 16,
                padding: 18,
                background:
                  'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.98))',
                boxShadow: '0 22px 60px rgba(0,0,0,0.8)',
                border: '1px solid rgba(148,163,184,0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  fontSize: '0.85rem',
                  color: '#e5e7eb',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-regular fa-circle" style={{ color: '#fca5a5' }} />
                  <i className="fa-regular fa-circle" style={{ color: '#facc15' }} />
                  <i className="fa-regular fa-circle" style={{ color: '#4ade80' }} />
                </span>
                <span>Rating preview</span>
              </div>
              <div
                style={{
                  borderRadius: 12,
                  background: 'rgba(15,23,42,0.9)',
                  padding: 14,
                  border: '1px solid rgba(148,163,184,0.5)',
                  margin: 5,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: '0.92rem', color: '#e5e7eb', fontWeight: 600 }}>
                    Software Engineering (CSE-302)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    Dr. Hasan (b7) <strong>4.1</strong> overall (b7) moderate workload
                  </div>
                </div>
                <div style={{ marginBottom: 10, fontSize: '0.8rem', color: '#9ca3af' }}>
                  Good explanations, but lots of assignments. Midterm grading is strict.
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: '#9ca3af',
                  }}
                >
                  <span>
                    <i className="fa-solid fa-users" style={{ marginRight: 6, color: '#facc15' }} />
                    27 reviews
                  </span>
                  <span>
                    <i className="fa-regular fa-calendar" style={{ marginRight: 6 }} />
                    Fall 2024
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Why students use CVUR</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 16, maxWidth: 640 }}>
          CVUR is built specifically for COMSATS Vehari students. It stays light-weight, fast and
          focused on the things that actually matter when you are picking your next semester.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
          }}
        >
          {featureItems.map((f) => (
            <div
              key={f.title}
              style={{
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.4)',
                padding: 14,
                background: 'rgba(15,23,42,0.85)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(250,204,21,0.12)',
                    color: 'var(--primary)',
                  }}
                >
                  <i className={`fa-solid ${f.icon}`} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{f.title}</h3>
              </div>
              <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS + ABOUT */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h2 style={{ marginTop: 0 }}>How it works</h2>
          <ol
            style={{
              paddingLeft: 20,
              marginTop: 8,
              marginBottom: 12,
              color: 'var(--muted)',
              fontSize: '0.95rem',
            }}
          >
            {steps.map((step, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                <strong>Step {idx + 1}:</strong> {step}
              </li>
            ))}
          </ol>
          <div className="links">
            <Link to="/signup">Create Account</Link>
            <Link to="/login">Student Login</Link>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ marginTop: 0 }}>About CVUR</h2>
          <p className="muted" style={{ fontSize: '0.93rem', marginBottom: 10 }}>
            CVUR (Course &amp; Venue Review) is a side project built for COMSATS Vehari students. It
            is not an official COMSATS product, but aims to complement your academic advising by
            giving you quick access to what your batch mates actually experienced.
          </p>
          <p className="muted" style={{ fontSize: '0.93rem', marginBottom: 0 }}>
            Ratings are stored per term and summarized when a term ends, so browsing older semesters
            stays fast while new reviews remain fresh and focused.
          </p>
        </div>
      </div>

      {/* CONTACT / DEVELOPER SECTION */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Contact the developer</h2>
        <p className="muted" style={{ maxWidth: 620, marginBottom: 10 }}>
          Have a suggestion, found a bug or want to contribute a feature? Reach out and share what
          would make this portal more useful for you and your classmates.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 18,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <i className="fa-solid fa-envelope" style={{ color: 'var(--primary)' }} />
              <span>Use the channels below to contact the maintainer with feedback or ideas.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-code" style={{ color: 'var(--primary)' }} />
              <span>
                This project is built with React, Express and MongoDB as part of an advanced web lab
                semester project.
              </span>
            </div>
          </div>
        </div>

        <div className="links" style={{ marginTop: 16 }}>
          <a
            href="https://github.com/FawadSaqlain"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-github" style={{ marginRight: 6 }} />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/fawad-saqlain-software-engineer/"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-linkedin" style={{ marginRight: 6 }} />
            LinkedIn
          </a>
          <a href="mailto:saqlainfawad@gmail.com">
            <i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />
            Email
          </a>
        </div>
      </div>
    </>
  );
}

