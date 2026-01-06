import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function RequireAuth() {
  const token = useSelector((s) => s.auth.token);
  const location = useLocation();

  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
