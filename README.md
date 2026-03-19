# Maná — Aplicación Espiritual Católica

PWA católica de uso diario. Gratuita, sin registro, offline-first.

## Módulos

- **Examen de Conciencia** — Guía conversacional con IA para preparar la confesión
- **Un Santo Para Ti** — Descubrí tu santo patrono con ayuda de IA
- **Novenas** — Catálogo de novenas con recordatorios diarios via Web Push
- **Lectio Divina** — Lectura orante guiada por IA
- **Q&A** — Preguntas de fe y doctrina
- **Liturgia** — Tiempo litúrgico, lecturas y santo del día
- **Biblia** — (próximamente)

## Estructura

```
mana/
├── frontend/     # React 18 + Vite + TypeScript + TailwindCSS (PWA)
├── backend/      # Kotlin + Ktor 2 + SQLite
└── .github/      # CI workflows
```

## Requisitos

- **Backend**: JDK 17+, Gradle 8+
- **Frontend**: Node.js 18+, npm 9+

## Setup rápido

### 1. Variables de entorno

Crear `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@email.com
PORT=8080
```

Crear `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:8080
VITE_VAPID_PUBLIC_KEY=...
```

### 2. Backend

```bash
cd backend
./gradlew shadowJar
java -jar build/libs/mana-backend-all.jar
```

O en desarrollo:
```bash
cd backend
./gradlew run
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Build de producción:
```bash
npm run build
npm run preview
```

## Deploy con Cloudflare Tunnel

1. Instalar `cloudflared`:
   ```bash
   # Ubuntu/Debian
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
   sudo dpkg -i cloudflared.deb
   ```

2. Autenticarse:
   ```bash
   cloudflared tunnel login
   ```

3. Crear tunnel:
   ```bash
   cloudflared tunnel create mana
   ```

4. Configurar `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <TUNNEL_ID>
   credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: api.tu-dominio.com
       service: http://localhost:8080
     - hostname: tu-dominio.com
       service: http://localhost:4173
     - service: http_status:404
   ```

5. Ejecutar:
   ```bash
   cloudflared tunnel run mana
   ```

## Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```

## Arquitectura

- El backend actúa como proxy seguro para la API de Claude (la API key nunca llega al frontend)
- Estado del usuario persistido localmente en IndexedDB / localStorage (sin login)
- Notificaciones push diarias para novenas activas via Web Push API
- Rate limiting: 20 requests por IP por hora en endpoints de IA
