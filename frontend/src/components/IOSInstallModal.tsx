import { useState, useEffect } from 'react'
import Icon from './Icon'

interface IOSInstallModalProps {
  onClose: () => void
  show: boolean
}

export default function IOSInstallModal({ onClose, show }: IOSInstallModalProps) {
  const [browser, setBrowser] = useState<'safari' | 'chrome' | 'other'>('safari')

  useEffect(() => {
    // Detectar navegador
    const ua = navigator.userAgent
    if (ua.includes('CriOS')) {
      setBrowser('chrome')
    } else if (ua.includes('Safari') && !ua.includes('CriOS')) {
      setBrowser('safari')
    } else {
      setBrowser('other')
    }
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-dorado to-[#965519] flex items-center justify-center shadow-lg">
            <span className="text-3xl font-serif font-bold text-crema-50">M</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200 mb-2">
            Instalá Maná en tu iPhone
          </h2>
        </div>

        {/* Beneficios */}
        <div className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4 mb-6 space-y-2">
          <div className="flex items-center gap-3">
            <Icon name="check" size={18} className="text-dorado flex-shrink-0" />
            <p className="text-xs text-cafe-dark dark:text-crema-200">Funciona 100% offline</p>
          </div>
          <div className="flex items-center gap-3">
            <Icon name="book-open" size={18} className="text-dorado flex-shrink-0" />
            <p className="text-xs text-cafe-dark dark:text-crema-200">Biblia completa siempre disponible</p>
          </div>
          <div className="flex items-center gap-3">
            <Icon name="sparkles" size={18} className="text-dorado flex-shrink-0" />
            <p className="text-xs text-cafe-dark dark:text-crema-200">Acceso rápido desde tu pantalla de inicio</p>
          </div>
        </div>

        {/* Instrucciones según navegador */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-cafe-dark dark:text-crema-200 uppercase tracking-wider">
            {browser === 'chrome' ? '📱 Instrucciones para Chrome' : browser === 'safari' ? '📱 Instrucciones para Safari' : '📱 Instrucciones'}
          </p>

          {browser === 'chrome' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium mb-1">
                      Presioná el botón <strong>Compartir</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-oscuro-bg flex items-center justify-center border border-crema-200 dark:border-oscuro-border">
                        <Icon name="share" size={16} className="text-blue-500" />
                      </div>
                      <span className="text-xs text-cafe-light dark:text-crema-300">(botón cuadrado con flecha)</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Buscá y tocá <strong>"Añadir a pantalla de inicio"</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {browser === 'safari' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium mb-2">
                      Presioná los <strong>3 puntos (...)</strong> en la barra inferior
                    </p>
                    <p className="text-xs text-cafe-light dark:text-crema-300 mt-1">
                      Luego presioná el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Buscá y tocá <strong>"Agregar a Inicio"</strong>
                    </p>
                    <p className="text-xs text-cafe-light dark:text-crema-300 mt-1">
                      (puede estar más abajo en el menú)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {browser === 'other' && (
            <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
                Para instalar Maná, te recomendamos abrir esta página en <strong>Safari</strong> o <strong>Chrome</strong> 
                y seguir las instrucciones que aparecerán.
              </p>
            </div>
          )}
        </div>

        {/* Botón cerrar */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper para detectar si es iOS y no está instalada
export function shouldShowIOSInstall(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
  const hasSeenPrompt = localStorage.getItem('ios-install-prompt-dismissed')
  
  return isIOS && !isInstalled && !hasSeenPrompt
}

export function dismissIOSInstallPrompt() {
  localStorage.setItem('ios-install-prompt-dismissed', Date.now().toString())
}
