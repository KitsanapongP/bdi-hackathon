import React, { useEffect, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

function normalizeWebsiteUrl(url) {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

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
                    throw new Error('ไม่สามารถโหลดข้อมูลภาคีเครือข่ายได้');
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'ไม่สามารถโหลดข้อมูลภาคีเครือข่ายได้');
                }

                if (isMounted) {
                    setSponsors(payload.data);
                    setLoading(false);
                }
            } catch {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลภาคีเครือข่าย');
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
                    <h1>ภาคีเครือข่ายความร่วมมือ</h1>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : sponsors.length === 0 ? (
                        <p className="gt-info-status">ยังไม่มีข้อมูลภาคีเครือข่าย</p>
                    ) : (
                        <div className="gt-sponsors-page-grid">
                            {sponsors.map((sponsor) => {
                                const websiteUrl = normalizeWebsiteUrl(sponsor.websiteUrl);

                                if (!websiteUrl) {
                                    return (
                                        <article key={sponsor.id} className="gt-sponsor-page-card">
                                            <div className="gt-sponsor-page-logo-wrap">
                                                <img
                                                    src={apiUrl(sponsor.logoUrl)}
                                                    alt={sponsor.nameEn || sponsor.nameTh || 'Partner'}
                                                    className="gt-sponsor-page-logo"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                            <p className="gt-sponsor-page-name">{sponsor.nameTh || sponsor.nameEn || '-'}</p>
                                        </article>
                                    );
                                }

                                return (
                                    <a
                                        key={sponsor.id}
                                        href={websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gt-sponsor-page-link"
                                    >
                                        <article className="gt-sponsor-page-card">
                                            <div className="gt-sponsor-page-logo-wrap">
                                                <img
                                                    src={apiUrl(sponsor.logoUrl)}
                                                    alt={sponsor.nameEn || sponsor.nameTh || 'Partner'}
                                                    className="gt-sponsor-page-logo"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                            <p className="gt-sponsor-page-name">{sponsor.nameTh || sponsor.nameEn || '-'}</p>
                                        </article>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default SponsorsPage;
