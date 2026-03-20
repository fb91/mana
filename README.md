# Maná — Aplicación Espiritual Católica

PWA católica de uso diario. Gratuita, sin registro, offline-first.

Desarrollada por **Fabricio Bianchi** como proyecto sin ánimos de lucro.

---

## Navegación

La barra inferior tiene tres botones:

| Botón | Destino |
|---|---|
| 🛠️ **Herramientas** | Hub con todas las utilidades espirituales |
| ✝️ **Evangelio del día** | Tiempo litúrgico y lecturas del día |
| ⚙️ **Ajustes** | Preferencias visuales y créditos |

---

## Módulos

### Herramientas espirituales (`/herramientas`)
Hub central desde el que se accede a todas las utilidades.

- **📖 La Biblia** — Lectura completa por libro y capítulo (Nueva Biblia de Jerusalén). Seleccioná versículos para hacer Lectio Divina guiada por IA.
- **💡 Recomendación espiritual** — Describís cómo te sentís y la IA sugiere un pasaje bíblico. El texto del versículo se resuelve desde el JSON local, nunca lo genera la IA.
- **✨ ¿Con qué santo conectás?** — Valorás 5 ejes de tu vida (escala 1–5) y la IA recomienda 3 santos de la tradición católica que conectan con tu perfil.
- **📿 Novenas** — Catálogo de novenas con recordatorios diarios via Web Push.
- **🙏 Examen de Conciencia** — Nube de preguntas por perfil (adultos / jóvenes / niños) desde JSON estático. Seleccionás las que te tocan el corazón y descargás tu examen personalizado.
- **📚 Devocionario** — *Próximamente.*

### Evangelio del día (`/liturgia`)
Tiempo litúrgico actual, santo del día y lecturas litúrgicas.

### Ajustes (`/ajustes`)
- Modo oscuro / claro
- Tamaño de letra (pequeña / normal / grande)
- Disclaimer sobre contenido de IA y fuentes bíblicas
- Créditos

---

## Notas sobre IA y contenido bíblico

- **Texto bíblico**: nunca generado por IA. Siempre resuelto desde `backend/data/bible_es.json`.
- **Prompts de IA**: todos incluyen un bloque `MAGISTERIO` que acota las respuestas a la doctrina católica oficial.
- **Ante dudas doctrinales**: consultar con un sacerdote.

---

## Estructura del proyecto

```
mana/
├── frontend/          # React 18 + Vite + TypeScript + TailwindCSS (PWA)
│   └── src/
│       ├── pages/     # Una página por ruta
│       ├── components/
│       ├── services/  # api.ts — todas las llamadas al backend
│       ├── store/     # Zustand (darkMode, fontSize, etc.)
│       └── data/      # santoAxes.ts — ejes para recomendación de santos
├── backend/           # Kotlin + Ktor 2 + SQLite
│   ├── src/main/kotlin/com/mana/
│   │   ├── routes/    # AIRoutes, BibleRoutes, ExamenRoutes, NovenasRoutes, PushRoutes
│   │   ├── services/  # ClaudeService, BibleService, PushNotificationScheduler
│   │   └── models/    # Models.kt
│   └── data/
│       ├── bible_es.json                        # Biblia completa (NBJ)
│       └── conscience_examination_guidance.json # Preguntas del examen
└── .github/workflows/ # CI
```

---

## Requisitos

- **Backend**: JDK 17+, Gradle 8+
- **Frontend**: Node.js 18+, npm 9+

---

## Setup rápido

### 1. Variables de entorno

`backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@email.com
PORT=8080
```

`frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=...
```

### 2. Backend

```bash
cd backend && ./gradlew run
```

Producción:
```bash
./gradlew shadowJar
java -jar build/libs/mana-backend-all.jar
```

### 3. Frontend

```bash
cd frontend && npm install && npm run dev
```

Build de producción:
```bash
npm run build
```

---

## Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

---

## Arquitectura

- El backend actúa como proxy seguro para la API de Claude (la API key nunca llega al frontend)
- Estado del usuario persistido en localStorage vía Zustand (sin login, sin cuenta)
- Notificaciones push diarias para novenas activas via Web Push API
- Rate limiting: 20 requests por IP por hora en endpoints de IA
- Todo el texto bíblico se resuelve server-side desde `bible_es.json`
