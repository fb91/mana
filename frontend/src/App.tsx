import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import ExamenPage from './pages/ExamenPage'
import SantoPage from './pages/SantoPage'
import NovenasPage from './pages/NovenasPage'
import NovenaDetallePage from './pages/NovenaDetallePage'
import LiturgiaPage from './pages/LiturgiaPage'
import BibliaPage from './pages/BibliaPage'
import InicioPage from './pages/InicioPage'
import RecomendacionPage from './pages/RecomendacionPage'
import AjustesPage from './pages/AjustesPage'
import { useAppStore, applyTheme, applyFontSize } from './store/useAppStore'

export default function App() {
  const { theme, fontSize } = useAppStore()

  // Apply persisted settings on mount
  useEffect(() => {
    applyTheme(theme)
    applyFontSize(fontSize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-crema dark:bg-oscuro-bg">
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<InicioPage />} />
            <Route path="/liturgia" element={<LiturgiaPage />} />
            <Route path="/recomendacion" element={<RecomendacionPage />} />
            <Route path="/ajustes" element={<AjustesPage />} />
            <Route path="/biblia" element={<BibliaPage />} />
            <Route path="/biblia/:book/:chapter" element={<BibliaPage />} />
            <Route path="/examen" element={<ExamenPage />} />
            <Route path="/santo" element={<SantoPage />} />
            <Route path="/novenas" element={<NovenasPage />} />
            <Route path="/novenas/:id" element={<NovenaDetallePage />} />
          </Routes>
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </BrowserRouter>
  )
}
