import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../lib/api';

export default function AdminRequestsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    fetch(apiUrl('/api/admin/requests'), { credentials: 'include' }).then(r=>r.json()).then(d=>setItems(d.data || []));
  }, []);

  return <div><h2>Team Requests</h2><ul>{items.map((i) => <li key={i.submission_id}><Link to={`/admin/requests/${i.submission_id}`}>#{i.submission_id} {i.team_name} - {i.status}</Link></li>)}</ul></div>;
}
