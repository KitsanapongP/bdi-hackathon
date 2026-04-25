import { AlertTriangle } from 'lucide-react'

export default function AdminConfirmModal({
  open,
  title = 'Confirm action',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="admin-ui-confirm-layer" role="dialog" aria-modal="true">
      <button type="button" className="admin-ui-confirm-backdrop" onClick={onCancel} aria-label="close modal" />
      <div className="admin-ui-confirm-card">
        <div className={`admin-ui-confirm-icon ${danger ? 'danger' : ''}`}>
          <AlertTriangle size={18} />
        </div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        <div className="admin-ui-confirm-actions">
          <button type="button" className="admin-ui-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`admin-ui-btn ${danger ? 'admin-ui-btn-danger' : 'admin-ui-btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
