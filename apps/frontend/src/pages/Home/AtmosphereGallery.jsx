import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

function AtmosphereGallery({ photos = [] }) {
  const normalizedPhotos = useMemo(
    () => (Array.isArray(photos) ? photos.filter((item) => item?.imageUrl) : []),
    [photos],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const activeThumbRef = useRef(null)
  const viewerThumbRef = useRef(null)

  const total = normalizedPhotos.length

  useEffect(() => {
    if (activeIndex >= total && total > 0) {
      setActiveIndex(0)
    }
  }, [activeIndex, total])

  // เลื่อน thumbnail ที่กำลังเลือก (ทั้งแถบปกติและใน viewer) ให้อยู่ในมุมมองเสมอ
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    viewerThumbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeIndex, viewerOpen])

  useEffect(() => {
    if (paused || viewerOpen || total <= 1) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [total, paused, viewerOpen])

  const goToNext = useCallback(() => {
    if (total <= 1) return
    setActiveIndex((prev) => (prev + 1) % total)
  }, [total])

  const goToPrev = useCallback(() => {
    if (total <= 1) return
    setActiveIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  const openViewer = (index) => {
    setActiveIndex(index)
    setViewerOpen(true)
  }

  // ล็อกการเลื่อนหน้าเว็บ + คีย์ลัด (← → Esc) ระหว่างเปิด viewer
  useEffect(() => {
    if (!viewerOpen) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeydown = (event) => {
      if (event.key === 'Escape') setViewerOpen(false)
      else if (event.key === 'ArrowRight') goToNext()
      else if (event.key === 'ArrowLeft') goToPrev()
    }
    window.addEventListener('keydown', handleKeydown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [viewerOpen, goToNext, goToPrev])

  const handleStageKeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openViewer(activeIndex)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goToNext()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goToPrev()
    }
  }

  if (!total) return null

  const safeIndex = Math.min(activeIndex, total - 1)
  const activePhoto = normalizedPhotos[safeIndex]

  const viewer = viewerOpen ? (
    <div
      className="gt-atmosphere-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="ดูภาพบรรยากาศงาน"
      onClick={() => setViewerOpen(false)}
    >
      <div className="gt-atmosphere-viewer-top" onClick={(event) => event.stopPropagation()}>
        <span className="gt-atmosphere-viewer-counter">{safeIndex + 1} / {total}</span>
        <button
          type="button"
          className="gt-atmosphere-viewer-close"
          onClick={() => setViewerOpen(false)}
          aria-label="ปิด"
        >
          <X size={22} />
        </button>
      </div>

      <div className="gt-atmosphere-viewer-main" onClick={(event) => event.stopPropagation()}>
        {total > 1 ? (
          <button
            type="button"
            className="gt-atmosphere-viewer-nav gt-atmosphere-viewer-nav-prev"
            onClick={goToPrev}
            aria-label="ภาพก่อนหน้า"
          >
            <ChevronLeft size={30} />
          </button>
        ) : null}

        <figure className="gt-atmosphere-viewer-figure">
          <img
            className="gt-atmosphere-viewer-image"
            src={activePhoto.imageUrl}
            alt={activePhoto.imageAlt || activePhoto.caption || 'ภาพบรรยากาศงาน'}
            loading="eager"
          />
          {activePhoto.caption ? (
            <figcaption className="gt-atmosphere-viewer-caption">{activePhoto.caption}</figcaption>
          ) : null}
        </figure>

        {total > 1 ? (
          <button
            type="button"
            className="gt-atmosphere-viewer-nav gt-atmosphere-viewer-nav-next"
            onClick={goToNext}
            aria-label="ภาพถัดไป"
          >
            <ChevronRight size={30} />
          </button>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="gt-atmosphere-viewer-strip" onClick={(event) => event.stopPropagation()}>
          {normalizedPhotos.map((photo, index) => (
            <button
              key={photo.id ?? index}
              type="button"
              ref={index === safeIndex ? viewerThumbRef : null}
              className={`gt-atmosphere-viewer-thumb ${index === safeIndex ? 'is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`ดูภาพที่ ${index + 1}`}
              aria-current={index === safeIndex ? 'true' : undefined}
            >
              <img
                src={photo.thumbUrl || photo.imageUrl}
                alt={photo.imageAlt || photo.caption || `ภาพย่อ ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <div
      className="gt-atmosphere"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="gt-atmosphere-header">
        <h2 className="gt-atmosphere-title">ภาพบรรยากาศภายในงาน</h2>
        <p className="gt-atmosphere-subtitle">ภาพความประทับใจจากกิจกรรม BDI Young Innovator Hackathon</p>
      </div>

      <div
        className="gt-atmosphere-stage"
        role="button"
        tabIndex={0}
        aria-label="ขยายดูภาพบรรยากาศ"
        onClick={() => openViewer(activeIndex)}
        onKeyDown={handleStageKeydown}
      >
        {normalizedPhotos.map((photo, index) => (
          <img
            key={photo.id ?? index}
            className={`gt-atmosphere-featured ${index === activeIndex ? 'is-active' : ''}`}
            src={photo.imageUrl}
            alt={photo.imageAlt || photo.caption || `ภาพบรรยากาศ ${index + 1}`}
            loading={index === activeIndex ? 'eager' : 'lazy'}
            decoding="async"
            aria-hidden={index === activeIndex ? undefined : true}
          />
        ))}
        <span className="gt-atmosphere-featured-overlay" />
        {activePhoto.caption ? <p className="gt-atmosphere-caption">{activePhoto.caption}</p> : null}
        <span className="gt-atmosphere-counter">
          {safeIndex + 1} / {total}
        </span>
        <span className="gt-atmosphere-expand" aria-hidden="true">
          <Maximize2 size={16} />
          กดเพื่อดูเต็มจอ
        </span>

        {total > 1 ? (
          <>
            <button
              type="button"
              className="gt-atmosphere-nav gt-atmosphere-nav-prev"
              onClick={(event) => {
                event.stopPropagation()
                goToPrev()
              }}
              aria-label="ภาพก่อนหน้า"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              className="gt-atmosphere-nav gt-atmosphere-nav-next"
              onClick={(event) => {
                event.stopPropagation()
                goToNext()
              }}
              aria-label="ภาพถัดไป"
            >
              <ChevronRight size={26} />
            </button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="gt-atmosphere-thumbs">
          {normalizedPhotos.map((photo, index) => (
            <button
              key={photo.id ?? index}
              type="button"
              ref={index === activeIndex ? activeThumbRef : null}
              className={`gt-atmosphere-thumb ${index === activeIndex ? 'is-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`เลือกภาพที่ ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            >
              <img
                src={photo.thumbUrl || photo.imageUrl}
                alt={photo.imageAlt || photo.caption || `ภาพย่อ ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      ) : null}

      {typeof document !== 'undefined' && viewer ? createPortal(viewer, document.body) : null}
    </div>
  )
}

export default AtmosphereGallery
