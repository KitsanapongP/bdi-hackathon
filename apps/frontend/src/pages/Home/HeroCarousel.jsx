import { useEffect, useMemo, useState } from 'react'

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
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(max-width: 768px)')
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
    }, 5500)
    return () => window.clearInterval(timer)
  }, [normalizedSlides.length, paused])

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

  if (!normalizedSlides.length) return null

  return (
    <section
      className="gt-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-label="Home spotlight carousel"
    >
      <div className="gt-hero-carousel-stage">
        {visibleSlides.map(({ slide, index, offset }) => {
          const visual = getCardTransform(offset, isMobileViewport)
          const isActive = offset === 0
          const style = {
            transform: `translateX(-50%) translateX(${visual.shift}) scale(${visual.scale}) rotateY(${visual.rotate}deg)`,
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

          if (slide.targetUrl) {
            const openInNewTab = slide.openInNewTab !== false
            return (
              <a
                key={slide.id}
                className={`gt-hero-carousel-card ${isActive ? 'is-active' : ''}`}
                href={slide.targetUrl}
                target={openInNewTab ? '_blank' : '_self'}
                rel={openInNewTab ? 'noopener noreferrer' : undefined}
                style={style}
                data-offset={offset}
                onClick={(event) => {
                  if (!isActive) {
                    event.preventDefault()
                    setActiveIndex(index)
                  }
                }}
              >
                {cardInner}
              </a>
            )
          }

          return (
            <button
              key={slide.id}
              type="button"
              className={`gt-hero-carousel-card gt-hero-carousel-card-btn ${isActive ? 'is-active' : ''}`}
              style={style}
              data-offset={offset}
              onClick={() => setActiveIndex(index)}
            >
              {cardInner}
            </button>
          )
        })}
      </div>

    </section>
  )
}

export default HeroCarousel
