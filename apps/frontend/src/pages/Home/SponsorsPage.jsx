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
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchSponsorGroups = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(apiUrl('/api/content/sponsor-groups'), {
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
                    setGroups(payload.data);
                    setLoading(false);
                }
            } catch {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลภาคีเครือข่าย');
                setGroups([]);
                setLoading(false);
            }
        };

        fetchSponsorGroups();

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
                    ) : groups.length === 0 || groups.every((group) => !Array.isArray(group?.sponsors) || group.sponsors.length === 0) ? (
                        <p className="gt-info-status">ยังไม่มีข้อมูลภาคีเครือข่าย</p>
                    ) : (
                        <div className="gt-sponsors-page-groups">
                            {groups.map((group) => {
                                const sponsors = Array.isArray(group?.sponsors) ? group.sponsors : [];
                                if (sponsors.length === 0) return null;
                                const isUngroupedGroup =
                                    group?.code === 'ungrouped'
                                    || Number(group?.id) === 0
                                    || group?.nameTh === 'ภาคีที่ไม่ได้อยู่ในกลุ่ม'
                                    || group?.nameEn === 'Ungrouped Partners';

                                return (
                                    <section key={group.id} className="gt-sponsors-page-group">
                                        {isUngroupedGroup ? null : <h2>{group.nameTh || group.nameEn || '-'}</h2>}
                                        <div className="gt-sponsors-page-grid">
                                            {sponsors.map((sponsor) => {
                                                const websiteUrl = normalizeWebsiteUrl(sponsor.websiteUrl);
                                                const sponsorName = sponsor.nameTh || sponsor.nameEn || '-';

                                                const card = (
                                                    <article className="gt-sponsor-page-card">
                                                        {isUngroupedGroup ? (
                                                            <p className="gt-sponsor-page-name gt-sponsor-page-name-top">{sponsorName}</p>
                                                        ) : null}
                                                        <div className="gt-sponsor-page-logo-wrap">
                                                            <img
                                                                src={apiUrl(sponsor.logoUrl)}
                                                                alt={sponsor.nameEn || sponsor.nameTh || 'Partner'}
                                                                className="gt-sponsor-page-logo"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        </div>
                                                        {isUngroupedGroup ? null : <p className="gt-sponsor-page-name">{sponsorName}</p>}
                                                    </article>
                                                );

                                                if (!websiteUrl) {
                                                    return (
                                                        <React.Fragment key={sponsor.id}>{card}</React.Fragment>
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
                                                        {card}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </section>
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
