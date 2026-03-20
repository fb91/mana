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

- **Texto bíblico**: nunca generado por IA. Siempre resuelto desde `public/data/bible_es.json` (cacheado localmente).
- **Prompts de IA**: todos incluyen un bloque `MAGISTERIO` que acota las respuestas a la doctrina católica oficial.
- **Ante dudas doctrinales**: consultar con un sacerdote.

---

## Estructura del proyecto

```
mana/
└── frontend/          # React 18 + Vite + TypeScript + TailwindCSS (PWA)
    ├── api/           # Vercel serverless functions (API endpoints)
    │   ├── _claude.ts # Claude AI integration
    │   └── ai/        # /api/ai/* endpoints
    ├── src/
    │   ├── pages/     # Una página por ruta
    │   ├── components/
    │   ├── services/  # api.ts — llamadas a las serverless functions
    │   ├── store/     # Zustand (darkMode, fontSize, etc.)
    │   └── data/      # santoAxes.ts — ejes para recomendación de santos
    └── public/data/
        └── bible_es.json  # Biblia completa (NBJ)
```

---

## Requisitos

- Node.js 18+, npm 9+

---

## Setup rápido

### 1. Variables de entorno

`frontend/.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-...
VITE_VAPID_PUBLIC_KEY=...
```

En Vercel, configurar las mismas variables en el dashboard del proyecto.

### 2. Desarrollo local

```bash
cd frontend && npm install && npm run dev
```

### 3. Producción

Desplegado en **Vercel** con serverless functions.

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

- **Serverless functions** en Vercel como proxy seguro para la API de Claude (la API key nunca llega al cliente)
- Estado del usuario persistido en localStorage vía Zustand (sin login, sin cuenta)
- Notificaciones push diarias para novenas activas via Web Push API
- Todo el texto bíblico se resuelve client-side desde `public/data/bible_es.json`
- Caché de recomendaciones bíblicas en Vercel KV para reducir consumo de tokens
