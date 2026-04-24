import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function DetailDrawer({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="admin-ui-drawer-layer" role="dialog" aria-modal="true">
      <button type="button" className="admin-ui-drawer-backdrop" onClick={onClose} aria-label="close drawer" />
      <aside className="admin-ui-drawer">
        <header>
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="admin-ui-drawer-body">{children}</div>
      </aside>
    </div>
  )
}
