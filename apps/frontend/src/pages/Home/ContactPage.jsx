import React, { useEffect, useMemo, useState } from 'react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

const CONTACT_SECTIONS = [
    {
        key: 'event_inquiry',
        title: 'ติดต่อสอบถามรายละเอียดการจัดงาน',
    },
    {
        key: 'dataset_inquiry',
        title: 'ติดต่อสอบถามรายละเอียดชุดข้อมูล',
    },
    {
        key: 'tech_it',
        title: 'ฝ่ายเทคนิคและสารสนเทศ',
    },
    {
        key: 'facility',
        title: 'ฝ่ายอาคารสถานที่',
    },
];

const isKnownCategory = (category) => CONTACT_SECTIONS.some((section) => section.key === category);

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

    const contactsByCategory = useMemo(() => {
        const grouped = new Map(CONTACT_SECTIONS.map((section) => [section.key, []]));

        contacts.forEach((contact) => {
            const category = isKnownCategory(contact.contactCategory) ? contact.contactCategory : 'event_inquiry';
            grouped.get(category)?.push(contact);
        });

        return grouped;
    }, [contacts]);

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel">
                    <h1>ติดต่อสอบถาม</h1>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : (
                        <>
                            {contacts.length === 0 ? <p className="gt-info-status">ยังไม่มีข้อมูลติดต่อในระบบ</p> : null}
                            <div className="gt-contact-sections">
                                {CONTACT_SECTIONS.map((section) => {
                                    const sectionContacts = contactsByCategory.get(section.key) || [];

                                    return (
                                        <section key={section.key} className="gt-contact-section">
                                            <div className="gt-contact-section-head">
                                                <h2>{section.title}</h2>
                                            </div>

                                            {sectionContacts.length === 0 ? (
                                                <p className="gt-contact-section-empty">ยังไม่มีข้อมูลผู้ติดต่อในหมวดนี้</p>
                                            ) : (
                                                <div className="gt-contact-grid">
                                                    {sectionContacts.map((contact) => {
                                                        const role = contact.roleTh || contact.roleEn;
                                                        const organization = contact.organizationTh || contact.organizationEn;
                                                        const department = contact.departmentTh || contact.departmentEn;
                                                        const bio = contact.bioTh || contact.bioEn;

                                                        return (
                                                            <article key={contact.id} className="gt-contact-card">
                                                                <div className="gt-contact-card-head">
                                                                    <h3>{contact.displayNameTh || contact.displayNameEn}</h3>
                                                                    {role ? <p className="gt-contact-meta">{role}</p> : null}
                                                                </div>

                                                                {organization ? <p className="gt-contact-meta">{organization}</p> : null}
                                                                {department ? <p className="gt-contact-meta">{department}</p> : null}
                                                                {bio ? <p className="gt-contact-bio">{bio}</p> : null}

                                                                <div className="gt-contact-channels">
                                                                    {(contact.channels || []).map((channel) => (
                                                                        <div key={channel.id} className="gt-contact-channel">
                                                                            <span className="gt-contact-label">{channel.labelTh || channel.labelEn || channel.type}</span>
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
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default ContactPage;
