import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiUrl } from '../../lib/api';

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('gt_user') || 'null');

  const logout = async () => {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    localStorage.removeItem('gt_user');
    navigate('/home');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside style={{ background: '#111827', color: 'white', padding: 16 }}>
        <h3>Admin</h3>
        <nav style={{ display: 'grid', gap: 8 }}>
          <NavLink to="/admin">Dashboard</NavLink>
          <NavLink to="/admin/static">Static Website</NavLink>
          <NavLink to="/admin/requests">Team Requests</NavLink>
        </nav>
      </aside>
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #ddd' }}>
          <div>{user?.name || 'admin'}</div>
          <button onClick={logout}>Logout</button>
        </div>
        <div style={{ padding: 16 }}><Outlet /></div>
      </main>
    </div>
  );
}
