import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import HomeShell from './HomeShell';
import { apiUrl } from '../../lib/api';
import './InfoPages.css';

const VENUE_TABS = [
    { key: 'accommodation', labelTh: 'ที่พัก', labelEn: 'ACCOMMODATION' },
    { key: 'transportation', labelTh: 'การเดินทาง', labelEn: 'TRANSPORTATION' },
    { key: 'attraction', labelTh: 'สถานที่ท่องเที่ยว', labelEn: 'ATTRACTION' },
];

const DEFAULT_CATEGORY = VENUE_TABS[0].key;

function normalizeVenueCategory(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return VENUE_TABS.some((item) => item.key === normalized) ? normalized : null;
}

function VenueImageSlider({ images, venueName }) {
    const normalizedImages = useMemo(() => {
        if (!Array.isArray(images)) return [];

        return images.filter((image) => {
            if (!image || typeof image !== 'object') return false;
            if (typeof image.imageUrl !== 'string') return false;
            return image.imageUrl.trim().length > 0;
        });
    }, [images]);

    const [activeIndex, setActiveIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const goPrev = () => {
        setActiveIndex((prevIndex) => {
            if (prevIndex === 0) return normalizedImages.length - 1;
            return prevIndex - 1;
        });
    };

    const goNext = () => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % normalizedImages.length);
    };

    useEffect(() => {
        setActiveIndex(0);
    }, [normalizedImages.length]);

    useEffect(() => {
        if (normalizedImages.length <= 1 || isLightboxOpen) return undefined;

        const timerId = window.setInterval(() => {
            setActiveIndex((prevIndex) => (prevIndex + 1) % normalizedImages.length);
        }, 5000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [normalizedImages.length, isLightboxOpen]);

    useEffect(() => {
        if (!isLightboxOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsLightboxOpen(false);
                return;
            }

            if (normalizedImages.length <= 1) return;
            if (event.key === 'ArrowLeft') goPrev();
            if (event.key === 'ArrowRight') goNext();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isLightboxOpen, normalizedImages.length]);

    const hasManyImages = normalizedImages.length > 1;
    const currentImage = normalizedImages[activeIndex] || null;

    if (!currentImage) {
        return <div className="gt-venue-slider gt-venue-slider-empty">ยังไม่มีรูปภาพ</div>;
    }

    return (
        <>
            <div className="gt-venue-slider">
                <button
                    type="button"
                    className="gt-venue-slider-image-trigger"
                    onClick={() => setIsLightboxOpen(true)}
                    aria-label="ดูรูปขนาดใหญ่"
                >
                    {normalizedImages.map((image, index) => {
                        const isActive = index === activeIndex;
                        return (
                            <img
                                key={image.id || `${image.imageUrl}-${index}`}
                                src={apiUrl(image.imageUrl)}
                                alt={image.altTh || image.altEn || venueName || 'Venue image'}
                                loading={isActive ? 'eager' : 'lazy'}
                                decoding="async"
                                className={`gt-venue-slider-image ${isActive ? 'is-active' : ''}`}
                            />
                        );
                    })}
                </button>

                {hasManyImages ? (
                    <>
                        <button
                            type="button"
                            className="gt-venue-slider-arrow gt-venue-slider-arrow-left"
                            onClick={goPrev}
                            aria-label="รูปก่อนหน้า"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            className="gt-venue-slider-arrow gt-venue-slider-arrow-right"
                            onClick={goNext}
                            aria-label="รูปถัดไป"
                        >
                            <ChevronRight size={18} />
                        </button>

                        <div className="gt-venue-slider-dots" role="tablist" aria-label="ตัวเลือกภาพสถานที่">
                            {normalizedImages.map((image, index) => (
                                <button
                                    key={image.id || `${image.imageUrl}-${index}`}
                                    type="button"
                                    className={`gt-venue-slider-dot ${index === activeIndex ? 'is-active' : ''}`}
                                    onClick={() => setActiveIndex(index)}
                                    aria-label={`ไปยังรูปที่ ${index + 1}`}
                                    aria-selected={index === activeIndex}
                                />
                            ))}
                        </div>
                    </>
                ) : null}
            </div>

            {isLightboxOpen ? createPortal(
                <div className="gt-venue-lightbox" role="dialog" aria-modal="true" onClick={() => setIsLightboxOpen(false)}>
                    <button
                        type="button"
                        className="gt-venue-lightbox-close"
                        onClick={() => setIsLightboxOpen(false)}
                        aria-label="ปิดรูปขนาดใหญ่"
                    >
                        <X size={20} />
                    </button>

                    {hasManyImages ? (
                        <>
                            <button
                                type="button"
                                className="gt-venue-lightbox-arrow gt-venue-lightbox-arrow-left"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    goPrev();
                                }}
                                aria-label="รูปก่อนหน้า"
                            >
                                <ChevronLeft size={22} />
                            </button>
                            <button
                                type="button"
                                className="gt-venue-lightbox-arrow gt-venue-lightbox-arrow-right"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    goNext();
                                }}
                                aria-label="รูปถัดไป"
                            >
                                <ChevronRight size={22} />
                            </button>
                        </>
                    ) : null}

                    <div className="gt-venue-lightbox-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="gt-venue-lightbox-frame">
                            {normalizedImages.map((image, index) => {
                                const isActive = index === activeIndex;
                                return (
                                    <img
                                        key={`lightbox-${image.id || `${image.imageUrl}-${index}`}`}
                                        src={apiUrl(image.imageUrl)}
                                        alt={image.altTh || image.altEn || venueName || 'Venue image'}
                                        className={`gt-venue-lightbox-image ${isActive ? 'is-active' : ''}`}
                                    />
                                );
                            })}
                        </div>

                        {hasManyImages ? (
                            <div className="gt-venue-lightbox-dots" role="tablist" aria-label="ตัวเลือกรูปขนาดใหญ่">
                                {normalizedImages.map((image, index) => (
                                    <button
                                        key={`lightbox-dot-${image.id || `${image.imageUrl}-${index}`}`}
                                        type="button"
                                        className={`gt-venue-lightbox-dot ${index === activeIndex ? 'is-active' : ''}`}
                                        onClick={() => setActiveIndex(index)}
                                        aria-label={`ไปยังรูปที่ ${index + 1}`}
                                        aria-selected={index === activeIndex}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>,
                document.body,
            ) : null}
        </>
    );
}

function VenuesPage() {
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);

    useEffect(() => {
        let isMounted = true;

        const fetchVenues = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(apiUrl('/api/content/venues'), {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch venues: ${response.status}`);
                }

                const payload = await response.json();
                if (!payload?.ok || !Array.isArray(payload.data)) {
                    throw new Error(payload?.message || 'Failed to fetch venues');
                }

                if (isMounted) {
                    setVenues(payload.data);
                    setLoading(false);
                }
            } catch {
                if (!isMounted) return;
                setError('เกิดข้อผิดพลาดในการโหลดข้อมูลสถานที่จัดงาน');
                setVenues([]);
                setLoading(false);
            }
        };

        fetchVenues();

        return () => {
            isMounted = false;
        };
    }, []);

    const activeTab = VENUE_TABS.find((tab) => tab.key === activeCategory) || VENUE_TABS[0];

    const activeVenues = useMemo(() => {
        return venues.filter((venue) => normalizeVenueCategory(venue?.category) === activeCategory);
    }, [venues, activeCategory]);

    return (
        <HomeShell>
            <main className="gt-info-main gt-container">
                <section className="gt-info-panel gt-venues-panel">
                    <h1>สถานที่จัดงาน</h1>

                    <div className="gt-venue-tabs" role="tablist" aria-label="หมวดสถานที่จัดงาน">
                        {VENUE_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                className={`gt-venue-tab ${activeCategory === tab.key ? 'is-active' : ''}`}
                                aria-selected={activeCategory === tab.key}
                                onClick={() => setActiveCategory(tab.key)}
                            >
                                <span>{tab.labelTh}</span>
                                <small>{tab.labelEn}</small>
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p className="gt-info-status">กำลังโหลดข้อมูล...</p>
                    ) : error ? (
                        <p className="gt-info-status gt-info-status-error">{error}</p>
                    ) : activeVenues.length === 0 ? (
                        <p className="gt-info-status">ยังไม่มีข้อมูลในหมวด {activeTab.labelTh}</p>
                    ) : (
                        <div className="gt-venue-list">
                            {activeVenues.map((venue) => {
                                const venueName = venue.nameTh || venue.nameEn || '-';
                                const venueDescription = venue.descriptionTh || venue.descriptionEn || '-';

                                return (
                                    <article key={venue.id} className="gt-venue-card">
                                        <div className="gt-venue-card-info">
                                            <h2>{venueName}</h2>
                                            <p className="gt-venue-card-description">{venueDescription}</p>
                                        </div>
                                        <div className="gt-venue-card-media">
                                            <VenueImageSlider images={venue.images} venueName={venueName} />
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

export default VenuesPage;
