import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container small">
        <hr />
        <div className="footer-row">
          <div>© {year} CVUR Portal — COMSATS Vehari unofficial review portal</div>
          <div className="muted">"See clearly, choose wisely" • Built for CSC337 • <Link to="/">Home</Link></div>
        </div>
      </div>
    </footer>
  );
}
