import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function getRelativeOffset(index, activeIndex, total) {
  let diff = index - activeIndex
  if (diff > total / 2) diff -= total
  if (diff < -total / 2) diff += total
  return diff
}

function getCardTransform(offset) {
  if (offset === -2) return { shift: '-86%', scale: 0.72, rotate: 24, opacity: 0.45 }
  if (offset === -1) return { shift: '-50%', scale: 0.86, rotate: 14, opacity: 0.72 }
  if (offset === 0) return { shift: '0%', scale: 1, rotate: 0, opacity: 1 }
  if (offset === 1) return { shift: '50%', scale: 0.86, rotate: -14, opacity: 0.72 }
  if (offset === 2) return { shift: '86%', scale: 0.72, rotate: -24, opacity: 0.45 }
  return { shift: '0%', scale: 0.66, rotate: 0, opacity: 0 }
}

function HeroCarousel({ slides = [] }) {
  const normalizedSlides = Array.isArray(slides) ? slides.filter((item) => item?.imageUrl) : []
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

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

  const activeSlide = normalizedSlides[activeIndex]

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + normalizedSlides.length) % normalizedSlides.length)
  }

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % normalizedSlides.length)
  }

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
          const visual = getCardTransform(offset)
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

      <div className="gt-hero-carousel-caption">
        <h3>{activeSlide?.title}</h3>
        <p>{activeSlide?.description}</p>
      </div>

      <div className="gt-hero-carousel-controls">
        <button type="button" className="gt-hero-carousel-arrow" onClick={goPrev} aria-label="Previous slide">
          <ChevronLeft size={24} />
        </button>
        <button type="button" className="gt-hero-carousel-arrow" onClick={goNext} aria-label="Next slide">
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  )
}

export default HeroCarousel
