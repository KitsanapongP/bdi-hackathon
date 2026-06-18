import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './AdminSelect.css'

/**
 * Fully themed dropdown (no native <select>), so it renders correctly in dark mode
 * across every browser. Drop-in replacement for simple single-value selects.
 */
export default function AdminSelect({
  value,
  onChange,
  options,
  icon: Icon = null,
  placeholder = 'เลือก',
  ariaLabel,
  fullWidth = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const selected = options.find((option) => String(option.value) === String(value))

  return (
    <div className={`admin-select ${fullWidth ? 'is-full' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="admin-select-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {Icon ? <Icon size={14} className="admin-select-icon" /> : null}
        <span className={`admin-select-label ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} className={`admin-select-chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open ? (
        <ul className="admin-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value)
            return (
              <li key={String(option.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`admin-select-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check size={15} /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
