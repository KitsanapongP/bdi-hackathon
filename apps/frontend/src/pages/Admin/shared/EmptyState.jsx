import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'ไม่มีข้อมูล', description = '', action = null, compact = false }) {
  return (
    <div className={`admin-ui-empty-state ${compact ? 'compact' : ''}`}>
      <span className="admin-ui-empty-state-icon">
        <Inbox size={compact ? 16 : 20} />
      </span>
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
