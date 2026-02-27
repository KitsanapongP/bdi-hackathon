import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiUrl } from '../../lib/api';

export default function AdminGuard({ children }) {
  const [allowed, setAllowed] = useState(null);
  useEffect(() => {
    fetch(apiUrl('/api/admin/me/access'), { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAllowed(Boolean(d?.isAdmin)))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <div>Loading...</div>;
  if (!allowed) return <Navigate to="/home" replace />;
  return children;
}
