import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import ExamenPage from './pages/ExamenPage'
import SantoPage from './pages/SantoPage'
import NovenasPage from './pages/NovenasPage'
import NovenaDetallePage from './pages/NovenaDetallePage'
import QAPage from './pages/QAPage'
import LiturgiaPage from './pages/LiturgiaPage'
import BibliaPage from './pages/BibliaPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-crema dark:bg-oscuro-bg">
        <main className="flex-1 overflow-y-auto pb-20">
          <Routes>
            <Route path="/" element={<Navigate to="/examen" replace />} />
            <Route path="/examen" element={<ExamenPage />} />
            <Route path="/santo" element={<SantoPage />} />
            <Route path="/novenas" element={<NovenasPage />} />
            <Route path="/novenas/:id" element={<NovenaDetallePage />} />
            <Route path="/qa" element={<QAPage />} />
            <Route path="/liturgia" element={<LiturgiaPage />} />
            <Route path="/biblia" element={<BibliaPage />} />
            <Route path="/biblia/:book/:chapter" element={<BibliaPage />} />
          </Routes>
        </main>
        <BottomNav />
        <InstallPrompt />
      </div>
    </BrowserRouter>
  )
}
