import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { AdminToastContext } from './adminContexts'

export function AdminToastViewport({ toasts, onClose }) {
  return (
    <div className="admin-ui-toast-wrap" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`admin-ui-toast admin-ui-toast-${toast.type}`}>
          <div className="admin-ui-toast-text">
            <strong>{toast.title}</strong>
            {toast.description ? <span>{toast.description}</span> : null}
          </div>
          <button type="button" onClick={() => onClose(toast.id)} aria-label="close toast">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((toast) => {
    const normalizeVariant = (rawVariant) => {
      const variant = String(rawVariant || '').toLowerCase()
      if (variant === 'error') return 'danger'
      if (variant === 'warn') return 'warning'
      if (variant === 'ok') return 'success'
      if (['success', 'warning', 'danger', 'info'].includes(variant)) return variant
      return 'success'
    }

    const normalizedVariant = normalizeVariant(toast.variant || toast.type)
    const id = `${Date.now()}-${Math.random()}`
    const durationMs = Number(toast.durationMs)
    const autoCloseMs = Number.isFinite(durationMs)
      ? Math.max(1200, durationMs)
      : normalizedVariant === 'danger' || normalizedVariant === 'warning'
        ? 7500
        : 5200
    const next = {
      id,
      type: normalizedVariant,
      title: toast.title || '',
      description: toast.description || '',
    }
    setToasts((prev) => [...prev, next])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, autoCloseMs)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return (
    <AdminToastContext.Provider value={{ pushToast }}>
      {children}
      <AdminToastViewport toasts={toasts} onClose={removeToast} />
    </AdminToastContext.Provider>
  )
}
