import React, { useEffect, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

function ContactPage() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchContacts = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(apiUrl('/api/content/contacts'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch contacts: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'Failed to fetch contacts');
                }

                if (isMounted) {
                    setContacts(payload.data);
                    setLoading(false);
                }
            } catch (err) {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลติดต่อ');
                setContacts([]);
                setLoading(false);
            }
        };

        fetchContacts();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>ติดต่อสอบถาม</h1>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : contacts.length === 0 ? (
                        <p className="gt-info-status">ยังไม่มีข้อมูลติดต่อ</p>
                    ) : (
                        <div className="gt-contact-grid">
                            {contacts.map((contact) => (
                                <article key={contact.id} className="gt-contact-card">
                                    <h2>{contact.displayNameTh || contact.displayNameEn}</h2>
                                    {contact.roleTh && <p className="gt-contact-meta">{contact.roleTh}</p>}
                                    {contact.organizationTh && <p className="gt-contact-meta">{contact.organizationTh}</p>}
                                    {contact.departmentTh && <p className="gt-contact-meta">{contact.departmentTh}</p>}
                                    {contact.bioTh && <p className="gt-contact-bio">{contact.bioTh}</p>}

                                    <div className="gt-contact-channels">
                                        {(contact.channels || []).map((channel) => (
                                            <div key={channel.id} className="gt-contact-channel">
                                                <span className="gt-contact-label">{channel.labelTh || channel.type}</span>
                                                {channel.url ? (
                                                    <a href={channel.url} target="_blank" rel="noopener noreferrer">
                                                        {channel.value}
                                                    </a>
                                                ) : (
                                                    <span>{channel.value}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default ContactPage;
