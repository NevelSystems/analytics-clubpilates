import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import LoginPage from './LoginPage'
import CentroLayout from './CentroLayout'
import HeatmapOcupacion from './components/HeatmapOcupacion'
import ComingSoon from './ComingSoon'
import ResetPassword from './ResetPassword'
import AdminUsuarios from './AdminUsuarios'

// Ruta protegida — redirige a login si no hay sesión
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirect inicial: manda al primer centro permitido
function RootRedirect() {
  const { isAdmin, allowedBranchIds, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (isAdmin || allowedBranchIds.length > 0) {
      // Admin: Supabase devolverá branches según RLS; usamos el primero disponible
      // Manager: primer centro asignado
      const firstBranch = allowedBranchIds[0]
      if (firstBranch) navigate(`/centro/${firstBranch}/ocupacion`, { replace: true })
    }
  }, [loading, isAdmin, allowedBranchIds])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Admin redirect: necesita cargar branches primero
function AdminRootRedirect() {
  const { isAdmin, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (isAdmin) {
      // Admin no tiene branch_ids, cargamos el primero de Supabase
      import('./lib/supabase').then(({ supabase }) => {
        supabase.from('branches').select('branch_id').order('name').limit(1)
          .then(({ data }) => {
            if (data?.[0]) navigate(`/centro/${data[0].branch_id}/ocupacion`, { replace: true })
          })
      })
    }
  }, [loading, isAdmin])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const { user, loading, isAdmin, allowedBranchIds } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={
        <ProtectedRoute>
          {isAdmin ? <AdminRootRedirect /> : <RootRedirect />}
        </ProtectedRoute>
      } />

      <Route path="/centro/:branchId" element={
        <ProtectedRoute><CentroLayout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="ocupacion" replace />} />
        <Route path="ocupacion" element={<OcupacionPage />} />
        <Route path="instructores" element={<ComingSoon titulo="Ranking de Instructores" />} />
        <Route path="miembros" element={<ComingSoon titulo="Métricas de Miembros" />} />
        <Route path="retencion" element={<ComingSoon titulo="Retención y Churn" />} />
        <Route path="usuarios" element={<AdminUsuariosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Wrapper para pasar branchId al heatmap desde los params
function OcupacionPage() {
  const { branchId } = useParams()
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Ocupación de clases</h2>
      <HeatmapOcupacion branchId={branchId} />
    </div>
  )
}

function AdminUsuariosPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  useEffect(() => { if (!isAdmin) navigate('/') }, [isAdmin])
  if (!isAdmin) return null
  return <AdminUsuarios />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}