import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
// InstallPrompt replaced by unified banner in InicioPage
import ExamenPage from './pages/ExamenPage'
import SantoPage from './pages/SantoPage'
import NovenasPage from './pages/NovenasPage'
import NovenaDetallePage from './pages/NovenaDetallePage'
import LiturgiaPage from './pages/LiturgiaPage'
import BibliaPage from './pages/BibliaPage'
import InicioPage from './pages/InicioPage'
import RecomendacionPage from './pages/RecomendacionPage'
import LectioPage from './pages/LectioPage'
import AjustesPage from './pages/AjustesPage'
import AsistentePage from './pages/AsistentePage'
import PedidoOracionPage from './pages/PedidoOracionPage'
import { BugReportProvider } from './components/BugReportButton'
import { useAppStore, applyTheme, applyFontSize, applyFontFamily, VALID_THEMES } from './store/useAppStore'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminNovenasPage from './pages/admin/AdminNovenasPage'
import AdminNovenaFormPage from './pages/admin/AdminNovenaFormPage'
import AdminRoute from './components/AdminRoute'
import { useAdminStore } from './store/useAdminStore'

function AppContent() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <div className="w-full sm:max-w-md sm:shadow-2xl lg:max-w-none lg:shadow-none flex flex-col min-h-screen" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
      {!isAdminRoute && <Sidebar />}
      <div className="flex flex-col flex-1 lg:ml-64">
        <main className="flex-1 overflow-hidden">
          <Routes>
          <Route path="/" element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<InicioPage />} />
          <Route path="/lecturas-del-dia" element={<LiturgiaPage />} />
          <Route path="/recomendacion" element={<RecomendacionPage />} />
          <Route path="/lectio" element={<LectioPage />} />
          <Route path="/ajustes" element={<AjustesPage />} />
          <Route path="/biblia" element={<BibliaPage />} />
          <Route path="/biblia/:book/:chapter" element={<BibliaPage />} />
          <Route path="/examen" element={<ExamenPage />} />
          <Route path="/santo" element={<SantoPage />} />
          <Route path="/novenas" element={<NovenasPage />} />
          <Route path="/novenas/:slug" element={<NovenaDetallePage />} />
          <Route path="/asistente" element={<AsistentePage />} />
          <Route path="/comunidad/pedido-oracion" element={<PedidoOracionPage />} />

          {/* ── Rutas de administración ── */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/novenas" element={<AdminRoute><AdminNovenasPage /></AdminRoute>} />
          <Route path="/admin/novenas/:id" element={<AdminRoute><AdminNovenaFormPage /></AdminRoute>} />

          </Routes>
        </main>
        {!isAdminRoute && <BottomNav />}
      </div>
    </div>
  )
}

export default function App() {
  const { theme, setTheme, fontSizeValue, fontFamily } = useAppStore()
  const { init: initAdmin } = useAdminStore()

  // Apply persisted settings on mount; migrate legacy themes to 'claro'
  useEffect(() => {
    const effective = VALID_THEMES.includes(theme) ? theme : 'claro'
    if (effective !== theme) setTheme('claro')
    applyTheme(effective)
    applyFontSize(fontSizeValue ?? 16)
    applyFontFamily(fontFamily ?? 'inter')

    // Ocultar splash screen una vez que React haya montado y aplicado los estilos
    const splash = document.getElementById('splash-screen')
    if (splash) {
      splash.classList.add('splash-hidden')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }

    // Inicializar sesión admin si existe (silencioso, no bloquea la app)
    initAdmin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <BugReportProvider>
        <div className="min-h-screen bg-token-bg sm:flex sm:justify-center" style={{ backgroundColor: 'rgb(var(--color-bg))' }}>
          <AppContent />
        </div>
      </BugReportProvider>
    </BrowserRouter>
  )
}
