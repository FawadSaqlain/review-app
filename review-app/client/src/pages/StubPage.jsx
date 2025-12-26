export default function StubPage({ title }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">This screen is ready in React, but needs backend JSON APIs to fully power it. We will enable it during the backend refactor phase.</p>
    </div>
  );
}
