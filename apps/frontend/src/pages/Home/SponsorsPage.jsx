import React, { useEffect, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

function SponsorsPage() {
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchSponsors = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(apiUrl('/api/content/sponsors'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch sponsors: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'Failed to fetch sponsors');
                }

                if (isMounted) {
                    setSponsors(payload.data);
                    setLoading(false);
                }
            } catch {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้สนับสนุน');
                setSponsors([]);
                setLoading(false);
            }
        };

        fetchSponsors();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>ผู้สนับสนุนอย่างเป็นทางการ</h1>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : sponsors.length === 0 ? (
                        <p className="gt-info-status">ยังไม่มีข้อมูลผู้สนับสนุน</p>
                    ) : (
                        <div className="gt-sponsors-page-grid">
                            {sponsors.map((sponsor) => (
                                <article key={sponsor.id} className="gt-sponsor-page-card">
                                    <div className="gt-sponsor-page-logo-wrap">
                                        <img
                                            src={apiUrl(sponsor.logoUrl)}
                                            alt={sponsor.nameEn || sponsor.nameTh || 'Sponsor'}
                                            className="gt-sponsor-page-logo"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                    <p className="gt-sponsor-page-name">{sponsor.nameTh || sponsor.nameEn || '-'}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default SponsorsPage;
