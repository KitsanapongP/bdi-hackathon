import { LoaderCircle } from 'lucide-react'

export default function LoadingState({ label = 'กําลังโหลดข้อมูล...', compact = false }) {
  return (
    <div className={`admin-ui-loading-state ${compact ? 'compact' : ''}`}>
      <LoaderCircle size={compact ? 16 : 18} className="spin" />
      <span>{label}</span>
    </div>
  )
}
