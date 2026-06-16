import { Navigate } from 'react-router-dom'

/** PCP dashboard is merged into the main Dashboard at `/`. */
export function PcpDashboard() {
  return <Navigate to="/" replace />
}
