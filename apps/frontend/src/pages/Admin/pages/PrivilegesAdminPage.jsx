import PrivilegesPage from './PrivilegesPage'
import { useAdminToast } from '../shared/adminContexts'

export default function PrivilegesAdminPage() {
  const { pushToast } = useAdminToast()
  return <PrivilegesPage pushToast={pushToast} />
}
