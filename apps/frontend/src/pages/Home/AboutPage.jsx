import React, { useEffect, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

function AboutPage() {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchAboutPage = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(apiUrl('/api/content/pages/ABOUT'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch about page: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !payload.data) {
                    throw new Error(payload?.message || 'Failed to fetch about page');
                }

                if (isMounted) {
                    setPage(payload.data);
                    setLoading(false);
                }
            } catch (err) {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลเกี่ยวกับ');
                setPage(null);
                setLoading(false);
            }
        };

        fetchAboutPage();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>{page?.titleTh || 'เกี่ยวกับ'}</h1>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : (
                        <div
                            className="gt-info-content"
                            dangerouslySetInnerHTML={{ __html: page?.contentHtmlTh || '<p>-</p>' }}
                        />
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default AboutPage;
