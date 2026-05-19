import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, Clock, Inbox, Loader2, MailCheck, MailQuestion, MailWarning } from 'lucide-react';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

function formatNotificationDate(value) {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
    }).format(date);
}

function getEmailDeliveryMeta(delivery) {
    if (!delivery) return null;

    if (delivery.status === 'sent' || delivery.status === 'read') {
        return { icon: <MailCheck size={16} />, className: 'is-sent', label: delivery.userMessage || 'ส่งอีเมลแล้ว' };
    }

    if (delivery.status === 'queued') {
        return { icon: <Clock size={16} />, className: 'is-queued', label: delivery.userMessage || 'ระบบกำลังรอส่งอีเมลอีกครั้ง' };
    }

    if (delivery.status === 'skipped') {
        return { icon: <MailQuestion size={16} />, className: 'is-skipped', label: delivery.userMessage || 'ไม่ได้ส่งอีเมล' };
    }

    return { icon: <MailWarning size={16} />, className: 'is-failed', label: delivery.userMessage || 'ส่งอีเมลไม่สำเร็จ' };
}

function openInFreshTab(url) {
    const nextWindow = window.open('about:blank', '_blank');
    if (!nextWindow) return false;

    nextWindow.opener = null;
    nextWindow.location.href = url;
    return true;
}

function renderMessageWithLinks(message) {
    const text = String(message || '');
    if (!text) return null;

    return text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
        if (/^https?:\/\/[^\s]+$/.test(part)) {
            return (
                <a
                    key={`${part}-${index}`}
                    className="gt-notification-message-link"
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openInFreshTab(part);
                    }}
                >
                    {part}
                </a>
            );
        }

        return part;
    });
}

function NotificationsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [markingId, setMarkingId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const [expandedIds, setExpandedIds] = useState(() => new Set());

    useEffect(() => {
        const loadNotifications = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(apiUrl('/api/notifications/inbox?limit=100'), {
                    credentials: 'include',
                });
                const payload = await response.json().catch(() => null);

                if (!response.ok || !payload?.ok) {
                    throw new Error(payload?.message || 'ไม่สามารถโหลดการแจ้งเตือนได้');
                }

                setItems(Array.isArray(payload.data) ? payload.data : []);
            } catch (err) {
                setError(err.message || 'ไม่สามารถโหลดการแจ้งเตือนได้');
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        loadNotifications();
    }, []);

    const markAsRead = async (notificationLogId) => {
        if (!notificationLogId) return;

        setMarkingId(notificationLogId);
        try {
            await fetch(apiUrl(`/api/notifications/inbox/${notificationLogId}/read`), {
                method: 'POST',
                credentials: 'include',
            });

            setItems((current) => current.map((item) => (
                item.notificationLogId === notificationLogId
                    ? { ...item, readAt: item.readAt || new Date().toISOString(), status: item.status === 'sent' ? 'read' : item.status }
                    : item
            )));
        } finally {
            setMarkingId(null);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0 || markingAll) return;

        setMarkingAll(true);
        try {
            await fetch(apiUrl('/api/notifications/inbox/read-all'), {
                method: 'POST',
                credentials: 'include',
            });

            const now = new Date().toISOString();
            setItems((current) => current.map((item) => ({
                ...item,
                readAt: item.readAt || now,
                status: item.status === 'sent' ? 'read' : item.status,
            })));
        } finally {
            setMarkingAll(false);
        }
    };

    const toggleExpanded = (notificationLogId) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(notificationLogId)) {
                next.delete(notificationLogId);
            } else {
                next.add(notificationLogId);
            }
            return next;
        });
    };

    const unreadCount = items.filter((item) => !item.readAt).length;

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel gt-notifications-panel">
                    <div className="gt-notifications-head">
                        <div>
                            {/* <p className="gt-notifications-kicker">Notification Center</p> */}
                            <h1>การแจ้งเตือน</h1>
                            {/* <p className="gt-notifications-subtitle">ติดตามผลการคัดเลือก การยืนยันสิทธิ์ และเหตุการณ์สำคัญของทีม</p> */}
                        </div>
                        <button
                            type="button"
                            className="gt-notifications-count"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0 || markingAll}
                            title={unreadCount > 0 ? 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด' : 'ไม่มีรายการที่ยังไม่ได้อ่าน'}
                        >
                            <Bell size={20} />
                            <span className="gt-notifications-count-default">{unreadCount} ยังไม่ได้อ่าน</span>
                            <span className="gt-notifications-count-hover">{markingAll ? 'กำลังบันทึก...' : 'อ่านทั้งหมด'}</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="gt-notifications-state">
                            <Loader2 className="gt-notifications-spinner" size={24} />
                            <span>กำลังโหลดการแจ้งเตือน...</span>
                        </div>
                    ) : error ? (
                        <div className="gt-notifications-state gt-notifications-error">{error}</div>
                    ) : items.length === 0 ? (
                        <div className="gt-notifications-empty">
                            <Inbox size={34} />
                            <h2>ยังไม่มีการแจ้งเตือน</h2>
                            <p>เมื่อมีประกาศหรือสถานะสำคัญเกี่ยวกับทีมของคุณ ระบบจะแสดงไว้ที่นี่</p>
                        </div>
                    ) : (
                        <div className="gt-notifications-list">
                            {items.map((item) => {
                                const isUnread = !item.readAt;
                                const isExpanded = expandedIds.has(item.notificationLogId);
                                const emailMeta = getEmailDeliveryMeta(item.emailDelivery);
                                return (
                                    <article key={item.notificationLogId} className={`gt-notification-card ${isUnread ? 'is-unread' : ''} ${isExpanded ? 'is-expanded' : ''}`}>
                                        <div className="gt-notification-body">
                                            <button
                                                type="button"
                                                className="gt-notification-summary"
                                                onClick={() => toggleExpanded(item.notificationLogId)}
                                                aria-expanded={isExpanded}
                                            >
                                                <span className="gt-notification-icon" aria-hidden="true">
                                                    {isUnread ? <Bell size={18} /> : <CheckCircle2 size={18} />}
                                                </span>
                                                <div className="gt-notification-summary-text">
                                                    <h2>{item.subject || 'การแจ้งเตือน'}</h2>
                                                    <time>{formatNotificationDate(item.createdAt)}</time>
                                                </div>
                                                <ChevronDown className="gt-notification-chevron" size={18} />
                                            </button>
                                            <div className="gt-notification-detail" aria-hidden={!isExpanded}>
                                                <div className="gt-notification-detail-inner">
                                                    {item.message ? <p>{renderMessageWithLinks(item.message)}</p> : null}
                                                    {emailMeta ? (
                                                        <div className="gt-notification-channels" aria-label="ช่องทางการแจ้งเตือน">
                                                            <div className={`gt-notification-channel ${emailMeta.className}`}>
                                                                {emailMeta.icon}
                                                                <div>
                                                                    <strong>{emailMeta.label}</strong>
                                                                    <span>
                                                                        {item.emailDelivery?.sentAt
                                                                            ? formatNotificationDate(item.emailDelivery.sentAt)
                                                                            : item.emailDelivery?.retryAfterAt
                                                                                ? `จะลองส่งอีกครั้งหลัง ${formatNotificationDate(item.emailDelivery.retryAfterAt)}`
                                                                                : 'ข้อมูลนี้ใช้เป็นหลักฐานการแจ้งจากระบบ'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    <div className="gt-notification-actions">
                                                        {isUnread ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => markAsRead(item.notificationLogId)}
                                                                disabled={markingId === item.notificationLogId}
                                                            >
                                                                {markingId === item.notificationLogId ? 'กำลังบันทึก...' : 'ทำเครื่องหมายว่าอ่านแล้ว'}
                                                            </button>
                                                        ) : (
                                                            <span>อ่านแล้ว {formatNotificationDate(item.readAt)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </HomeShell>
    );
}

export default NotificationsPage;
