import { Navigate } from 'react-router-dom'
import { useAdminStore } from '../store/useAdminStore'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean  // true = solo admin, false = admin o contributor
}

export default function AdminRoute({ children, requireAdmin = false }: Props) {
  const { session, loading, isAdmin, isContributor } = useAdminStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-crema dark:bg-oscuro-bg">
        <div className="w-6 h-6 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/admin/login" replace />

  if (requireAdmin && !isAdmin()) return <Navigate to="/admin/login" replace />
  if (!requireAdmin && !isContributor()) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
