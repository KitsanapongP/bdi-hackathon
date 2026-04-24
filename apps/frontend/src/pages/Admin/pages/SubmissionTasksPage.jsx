import SubmissionTasksPageView from './SubmissionTasksPageView'
import { useAdminToast } from '../shared/adminContexts'

export default function SubmissionTasksPage() {
  const { pushToast } = useAdminToast()
  return <SubmissionTasksPageView pushToast={pushToast} />
}
