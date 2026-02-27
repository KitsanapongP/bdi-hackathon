import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiUrl } from '../../lib/api';

export default function AdminRequestDetailPage() {
  const { submissionId } = useParams();
  const [data, setData] = useState(null);

  const load = () => fetch(apiUrl(`/api/admin/requests/${submissionId}`), { credentials: 'include' }).then(r=>r.json()).then(d=>setData(d.data));
  useEffect(() => { load(); }, [submissionId]);

  const approve = async () => { await fetch(apiUrl(`/api/admin/requests/${submissionId}/approve`), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }); load(); };

  return (
    <div>
      <h2>Request Detail #{submissionId}</h2>
      <button onClick={approve}>Approve</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
