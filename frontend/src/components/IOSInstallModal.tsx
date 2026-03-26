import { useState, useEffect } from 'react'
import Icon from './Icon'

type OS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown'
type Browser = 'chrome' | 'safari' | 'edge' | 'firefox' | 'other'

interface IOSInstallModalProps {
  onClose: () => void
  show: boolean
}

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows/.test(ua)) return 'windows'
  if (/Macintosh/.test(ua)) return 'macos'
  if (/Linux/.test(ua)) return 'linux'
  return 'unknown'
}

function detectBrowser(): Browser {
  const ua = navigator.userAgent
  if (ua.includes('EdgiOS') || ua.includes('Edg/')) return 'edge'
  if (ua.includes('CriOS') || ua.includes('Chrome/')) return 'chrome'
  if (ua.includes('FxiOS') || ua.includes('Firefox/')) return 'firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari'
  return 'other'
}

export default function IOSInstallModal({ onClose, show }: IOSInstallModalProps) {
  const [os, setOs] = useState<OS>('unknown')
  const [browser, setBrowser] = useState<Browser>('other')

  useEffect(() => {
    setOs(detectOS())
    setBrowser(detectBrowser())
  }, [])

  if (!show) return null

  const isMobile = os === 'ios' || os === 'android'
  const osLabel = {
    ios: 'iPhone/iPad',
    android: 'Android',
    windows: 'Windows',
    macos: 'Mac',
    linux: 'Linux',
    unknown: 'tu dispositivo',
  }[os]

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center lg:justify-center animate-fade-in lg:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full lg:max-w-lg bg-crema dark:bg-oscuro-bg rounded-t-3xl lg:rounded-3xl px-5 pt-5 pb-8 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="lg:hidden w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-dorado to-[#965519] flex items-center justify-center shadow-lg">
            <span className="text-3xl font-serif font-bold text-crema-50">M</span>
          </div>
          <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200 mb-2">
            Instalá Maná en {isMobile ? 'tu ' : ''}
            {isMobile ? osLabel : 'tu PC'}
          </h2>
          <p className="text-xs text-cafe-light dark:text-crema-400">
            {isMobile ? 'Acceso rápido desde tu pantalla de inicio' : 'Abre desde tu escritorio como aplicación'}
          </p>
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
            <p className="text-xs text-cafe-dark dark:text-crema-200">
              {isMobile ? 'Acceso rápido desde tu pantalla' : 'Lanzador dedicado'}
            </p>
          </div>
        </div>

        {/* Instrucciones según SO y navegador */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-cafe-dark dark:text-crema-200 uppercase tracking-wider">
            📱 Instrucciones para {os === 'ios' ? 'iPhone/iPad' : os === 'android' ? 'Android' : os === 'windows' ? 'Windows' : os === 'macos' ? 'Mac' : 'tu dispositivo'}
            {browser !== 'other' && ` · ${browser.charAt(0).toUpperCase() + browser.slice(1)}`}
          </p>

          {/* iOS - Safari */}
          {os === 'ios' && browser === 'safari' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                      Presioná los <strong>3 puntos (...)</strong> en la barra inferior
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Tocá <strong>Compartir</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    3
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

          {/* iOS - Chrome */}
          {os === 'ios' && browser === 'chrome' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                      Presioná el botón <strong>Compartir</strong> (3 puntos) en la barra inferior
                    </p>
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

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Confirmá tocando <strong>"Agregar"</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android - Chrome */}
          {os === 'android' && (browser === 'chrome' || browser === 'edge') && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                      Presioná el botón <strong>⋮ (3 puntos)</strong> en la esquina superior derecha
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Tocá <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      ¡Listo! La app aparecerá en tu home
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Windows/Mac - Chrome */}
          {(os === 'windows' || os === 'macos') && browser === 'chrome' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                      Buscá el ícono <strong>⬇ Instalar</strong> a la derecha de la barra de direcciones
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Hacé clic en él y confirmá la instalación
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      ¡Listo! Maná se abrirá en una ventana separada
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Windows/Mac - Edge */}
          {(os === 'windows' || os === 'macos') && browser === 'edge' && (
            <div className="space-y-3">
              <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                      Buscá el ícono <strong>⬇ Instalar esta aplicación</strong> a la derecha de la barra de direcciones
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Hacé clic en él y confirmá
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-dorado text-crema-50 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-cafe-dark dark:text-crema-200">
                      Se agregará a tu menú de aplicaciones
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback para navegadores no soportados */}
          {browser !== 'chrome' && browser !== 'safari' && browser !== 'edge' && (
            <div className="bg-crema-100 dark:bg-oscuro-surface rounded-xl p-4">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed mb-3">
                {isMobile
                  ? 'Te recomendamos abrir esta página en Chrome o Safari para instalar Maná fácilmente.'
                  : 'Te recomendamos abrir esta página en Chrome o Edge para instalar Maná como aplicación.'}
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-300">
                {isMobile
                  ? 'Una vez en el navegador recomendado, verás una opción de instalación.'
                  : 'El navegador detectará automáticamente que puede instalar Maná.'}
              </p>
            </div>
          )}
        </div>

        {/* Botón cerrar */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2
                       active:scale-[0.98] transition-all"
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
