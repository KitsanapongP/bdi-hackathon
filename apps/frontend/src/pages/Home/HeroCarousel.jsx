import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const MOBILE_CAROUSEL_QUERY =
  '(max-width: 768px), (pointer: coarse) and (orientation: portrait) and (max-width: 920px)'

function getRelativeOffset(index, activeIndex, total) {
  let diff = index - activeIndex
  if (diff > total / 2) diff -= total
  if (diff < -total / 2) diff += total
  return diff
}

function getCardTransform(offset, isMobileViewport = false) {
  if (isMobileViewport) {
    if (offset === 0) return { shift: '0%', scale: 1, rotate: 0, opacity: 1 }
    return { shift: '0%', scale: 0.94, rotate: 0, opacity: 0 }
  }

  if (offset === -2) return { shift: '-94%', scale: 0.68, rotate: 20, opacity: 0.42 }
  if (offset === -1) return { shift: '-58%', scale: 0.9, rotate: 10, opacity: 0.74 }
  if (offset === 0) return { shift: '0%', scale: 1.24, rotate: 0, opacity: 1 }
  if (offset === 1) return { shift: '58%', scale: 0.9, rotate: -10, opacity: 0.74 }
  if (offset === 2) return { shift: '94%', scale: 0.68, rotate: -20, opacity: 0.42 }
  return { shift: '0%', scale: 0.66, rotate: 0, opacity: 0 }
}

function HeroCarousel({ slides = [] }) {
  const normalizedSlides = Array.isArray(slides) ? slides.filter((item) => item?.imageUrl) : []
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [previewSlide, setPreviewSlide] = useState(null)
  const touchStartRef = useRef({ x: 0, y: 0 })
  const suppressTapRef = useRef(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MOBILE_CAROUSEL_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(MOBILE_CAROUSEL_QUERY)
    const handleChange = (event) => setIsMobileViewport(event.matches)

    setIsMobileViewport(mediaQuery.matches)

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (!normalizedSlides.length) return
    if (activeIndex >= normalizedSlides.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, normalizedSlides.length])

  useEffect(() => {
    if (paused || normalizedSlides.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % normalizedSlides.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [normalizedSlides.length, paused])

  useEffect(() => {
    if (!previewSlide) return undefined

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        setPreviewSlide(null)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [previewSlide])

  const visibleSlides = useMemo(
    () =>
      normalizedSlides
        .map((slide, index) => ({
          slide,
          index,
          offset: getRelativeOffset(index, activeIndex, normalizedSlides.length),
        }))
        .filter((item) => Math.abs(item.offset) <= 2),
    [activeIndex, normalizedSlides],
  )

  const goToNext = () => {
    if (normalizedSlides.length <= 1) return
    setActiveIndex((prev) => (prev + 1) % normalizedSlides.length)
  }

  const goToPrev = () => {
    if (normalizedSlides.length <= 1) return
    setActiveIndex((prev) => (prev - 1 + normalizedSlides.length) % normalizedSlides.length)
  }

  const handleTouchStart = (event) => {
    const touch = event.changedTouches?.[0]
    if (!touch) return
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    suppressTapRef.current = false
  }

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches?.[0]
    if (!touch) return

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const hasHorizontalSwipe = Math.abs(deltaX) > 36 && Math.abs(deltaX) > Math.abs(deltaY)

    if (!hasHorizontalSwipe) return

    suppressTapRef.current = true

    if (deltaX < 0) {
      goToNext()
      return
    }

    goToPrev()
  }

  if (!normalizedSlides.length) return null

  const lightbox = previewSlide ? (
    <div className="gt-hero-carousel-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" onClick={() => setPreviewSlide(null)}>
      <div className="gt-hero-carousel-lightbox-panel" onClick={(event) => event.stopPropagation()}>
        <div className="gt-hero-carousel-lightbox-topbar">
          <p className="gt-hero-carousel-lightbox-title">{previewSlide.title || 'Image preview'}</p>
          <div className="gt-hero-carousel-lightbox-topbar-actions">
            <a
              className="gt-hero-carousel-lightbox-btn"
              href={previewSlide.imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              ดาวน์โหลด
            </a>
            {previewSlide.targetUrl ? (
              <a
                className="gt-hero-carousel-lightbox-btn gt-hero-carousel-lightbox-btn-primary"
                href={previewSlide.targetUrl}
                target={previewSlide.openInNewTab !== false ? '_blank' : '_self'}
                rel={previewSlide.openInNewTab !== false ? 'noopener noreferrer' : undefined}
              >
                ไปยังเว็บไซต์
              </a>
            ) : null}
            <button
              type="button"
              className="gt-hero-carousel-lightbox-close"
              onClick={() => setPreviewSlide(null)}
              aria-label="Close image preview"
            >
              ×
            </button>
          </div>
        </div>

        <img
          className="gt-hero-carousel-lightbox-image"
          src={previewSlide.imageUrl}
          alt={previewSlide.imageAlt || previewSlide.title}
          loading="eager"
        />
      </div>
    </div>
  ) : null

  return (
    <section
      className="gt-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-label="Home spotlight carousel"
    >
      <div
        className="gt-hero-carousel-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {visibleSlides.map(({ slide, index, offset }) => {
          const visual = getCardTransform(offset, isMobileViewport)
          const isActive = offset === 0
          const style = {
            transform: `translateX(-50%)${isMobileViewport ? '' : ' translateY(-50%)'} translateX(${visual.shift}) scale(${visual.scale}) rotateY(${visual.rotate}deg)`,
            opacity: visual.opacity,
            zIndex: 50 - Math.abs(offset),
          }

          const cardInner = (
            <>
              <img
                className="gt-hero-carousel-image"
                src={slide.imageUrl}
                alt={slide.imageAlt || slide.title}
                loading={isActive ? 'eager' : 'lazy'}
              />
              <span className="gt-hero-carousel-overlay" />
              <div className="gt-hero-carousel-content">
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </div>
            </>
          )

          return (
            <button
              key={slide.id}
              type="button"
              className={`gt-hero-carousel-card gt-hero-carousel-card-btn ${isActive ? 'is-active' : ''}`}
              style={style}
              data-offset={offset}
              onClick={() => {
                if (suppressTapRef.current) {
                  suppressTapRef.current = false
                  return
                }

                if (!isActive) {
                  setActiveIndex(index)
                  return
                }

                setPreviewSlide(slide)
              }}
              aria-label={isActive ? `Open image preview: ${slide.title}` : `Select slide: ${slide.title}`}
            >
              {cardInner}
            </button>
          )
        })}
      </div>

      {typeof document !== 'undefined' && lightbox ? createPortal(lightbox, document.body) : null}

    </section>
  )
}

export default HeroCarousel
