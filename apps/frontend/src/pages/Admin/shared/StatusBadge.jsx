const teamStateLabel = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
  RETURNED: 'RETURNED',
  READY_TO_RESUBMIT: 'READY_TO_RESUBMIT',
  APPROVED: 'APPROVED',
}

const memberStateLabel = {
  PENDING: 'PENDING',
  NEED_FIX: 'NEED_FIX',
  RESUBMITTED: 'RESUBMITTED',
  APPROVED: 'APPROVED',
}

function getStatusTone(status) {
  if (status === 'APPROVED' || status === 'ENABLED') return 'success'
  if (status === 'NEED_FIX' || status === 'RETURNED' || status === 'DISABLED') return 'danger'
  if (status === 'RESUBMITTED' || status === 'READY_TO_RESUBMIT') return 'warning'
  if (status === 'IN_REVIEW') return 'info'
  return 'neutral'
}

export default function StatusBadge({ status, label }) {
  return (
    <span className={`admin-ui-status admin-ui-status-${getStatusTone(status)}`}>
      {label || teamStateLabel[status] || memberStateLabel[status] || status}
    </span>
  )
}
