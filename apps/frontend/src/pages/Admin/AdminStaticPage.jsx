import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/api';

export default function AdminStaticPage() {
  const [sponsors, setSponsors] = useState([]);
  const [name, setName] = useState('');

  const load = () => fetch(apiUrl('/api/admin/static/sponsors'), { credentials: 'include' }).then(r=>r.json()).then(d=>setSponsors(d.data || []));
  useEffect(() => { load(); }, []);

  const createSponsor = async () => {
    await fetch(apiUrl('/api/admin/static/sponsors'), {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sort_order: sponsors.length + 1, is_active: 1 }),
    });
    setName('');
    load();
  };

  return (
    <div>
      <h2>Static Website Management</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sponsor name" />
      <button onClick={createSponsor}>Add Sponsor</button>
      <ul>{sponsors.map((s) => <li key={s.sponsor_id}>{s.name}</li>)}</ul>
    </div>
  );
}
