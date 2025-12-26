import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function RequireAdmin() {
  const token = useSelector((s) => s.auth.adminToken);
  const location = useLocation();

  if (!token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
