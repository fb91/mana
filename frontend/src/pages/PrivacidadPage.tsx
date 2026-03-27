import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="info" size={18} />} title="Política de Privacidad" subtitle="Maná — Aplicación Espiritual Católica" />

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in pb-28">
        <div className="card px-5 py-5 space-y-5 text-cafe-dark dark:text-crema-200">

          <p className="text-xs text-cafe-light dark:text-crema-400">
            Última actualización: marzo 2025
          </p>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">1. ¿Qué datos recopilamos?</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Maná es una aplicación gratuita y sin ánimo de lucro. Solo recopilamos datos cuando el
              usuario elige identificarse con Google:
            </p>
            <ul className="text-sm leading-relaxed text-cafe-light dark:text-crema-300 list-disc list-inside space-y-1">
              <li>Nombre y foto de perfil de Google</li>
              <li>Dirección de correo electrónico</li>
              <li>Progreso espiritual (novenas, plan espiritual, citas bíblicas guardadas)</li>
            </ul>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Sin registro con Google, la app no recopila ningún dato personal. Todo se almacena
              localmente en el dispositivo.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">2. ¿Para qué usamos esos datos?</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Los datos se usan exclusivamente para sincronizar el progreso espiritual del usuario
              entre sus dispositivos. No utilizamos los datos para publicidad, análisis comercial
              ni los compartimos con terceros.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">3. ¿Dónde se almacenan?</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Los datos se almacenan en <strong>Supabase</strong>, una plataforma de base de datos en
              la nube con sede en la Unión Europea. Cada usuario solo puede acceder a sus propios
              datos (Row Level Security).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">4. ¿Podés eliminar tus datos?</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Sí. Podés cerrar sesión en cualquier momento desde la sección Ajustes. Para solicitar
              la eliminación completa de tu cuenta y datos, escribinos a través del repositorio
              de GitHub del proyecto.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">5. Cookies y rastreo</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Maná no usa cookies de rastreo ni publicidad. El único almacenamiento local que utiliza
              es <em>localStorage</em> para guardar preferencias visuales y progreso cuando no hay
              sesión activa.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">6. Menores de edad</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              La app no está dirigida a menores de 13 años. No recopilamos intencionalmente datos
              de menores.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">7. Cambios en esta política</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Cualquier cambio será publicado en esta misma página. El uso continuado de la app
              implica la aceptación de la política vigente.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">8. Contacto</h2>
            <p className="text-sm leading-relaxed text-cafe-light dark:text-crema-300">
              Para cualquier consulta sobre privacidad, podés abrir un issue en el{' '}
              <a
                href="https://github.com/fb91/mana"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dorado hover:underline"
              >
                repositorio de GitHub
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
