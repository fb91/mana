import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
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
import { BugReportProvider } from './components/BugReportButton'
import { useAppStore, applyTheme, applyFontSize, applyFontFamily, VALID_THEMES } from './store/useAppStore'

export default function App() {
  const { theme, setTheme, fontSizeValue, fontFamily, liturgicalAccent } = useAppStore()

  // Apply persisted settings on mount; migrate legacy themes to 'claro'
  useEffect(() => {
    const effective = VALID_THEMES.includes(theme) ? theme : 'claro'
    if (effective !== theme) setTheme('claro')
    applyTheme(effective, liturgicalAccent ?? false)
    applyFontSize(fontSizeValue ?? 16)
    applyFontFamily(fontFamily ?? 'inter')

    // Ocultar splash screen una vez que React haya montado y aplicado los estilos
    const splash = document.getElementById('splash-screen')
    if (splash) {
      splash.classList.add('splash-hidden')
      splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <BrowserRouter>
      <BugReportProvider>
        <div className="min-h-screen bg-stone-300 dark:bg-stone-900 sm:flex sm:justify-center">
          <div className="w-full sm:max-w-md sm:shadow-2xl flex flex-col min-h-screen bg-crema dark:bg-oscuro-bg">
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
              </Routes>
            </main>
            <BottomNav />

          </div>
        </div>
      </BugReportProvider>
    </BrowserRouter>
  )
}
