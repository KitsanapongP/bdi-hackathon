export default function EmptyState({ title = 'ไม่มีข้อมูล', description = '', action = null, compact = false }) {
  return (
    <div className={`admin-ui-empty-state ${compact ? 'compact' : ''}`}>
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
