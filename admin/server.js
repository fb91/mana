#!/usr/bin/env node
/**
 * Panel de administración de novenas — Maná App
 *
 * Requiere admin/.env (ver admin/.env.example)
 * Arrancar: npm run admin  (desde la raíz del proyecto)
 */
require('dotenv').config()

const express    = require('express')
const helmet     = require('helmet')
const rateLimit  = require('express-rate-limit')
const session    = require('express-session')
const bcrypt     = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const fs         = require('fs')
const path       = require('path')

// ── Validación de env ─────────────────────────────────────────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SESSION_SECRET']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error('\n❌ Variables de entorno faltantes en admin/.env:')
  missing.forEach(k => console.error(`   ${k}`))
  console.error('\n   Ver admin/.env.example para referencia.\n')
  process.exit(1)
}

const PORT         = process.env.PORT || 3001
const NOVENAS_PATH = path.resolve(__dirname, '../frontend/src/data/novenas.json')
const IS_PROD      = process.env.NODE_ENV === 'production'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)

const app = express()

// ── Seguridad: headers HTTP ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],   // necesario para el JS inline del panel
      styleSrc:   ["'self'", "'unsafe-inline'"],
    },
  },
}))

// ── Sesiones ──────────────────────────────────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                         // inaccesible desde JS del browser
    secure:   IS_PROD,                      // solo HTTPS en producción
    sameSite: 'lax',
    maxAge:   2 * 60 * 60 * 1000,          // 2 horas
  },
}))

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: false }))

// ── Rate limiting en login ────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,   // ventana de 15 minutos
  max:            10,                // máximo 10 intentos
  standardHeaders: true,
  legacyHeaders:   false,
  message:        { error: 'Demasiados intentos. Esperá 15 minutos.' },
})

// ── Middleware: verificar sesión ──────────────────────────────────────────────
function requireSession(req, res, next) {
  if (req.session?.authenticated) return next()
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autorizado' })
  res.redirect('/admin/login')
}

// ── Auth: verificar contra Supabase ──────────────────────────────────────────
async function verifyCredentials(username, password) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('password_hash')
    .eq('username', username)
    .single()

  if (error || !data) return false
  return bcrypt.compare(password, data.password_hash)
}

// ── Rutas de autenticación ────────────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session?.authenticated) return res.redirect('/admin')
  res.send(LOGIN_HTML)
})

app.post('/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).send(loginPage('Usuario y contraseña requeridos.'))
  }

  const valid = await verifyCredentials(username, password)
  if (!valid) {
    return res.status(401).send(loginPage('Credenciales incorrectas.'))
  }

  req.session.authenticated = true
  req.session.username = username
  res.redirect('/admin')
})

app.post('/admin/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/admin/login')
})

// ── Panel y API (protegidos) ──────────────────────────────────────────────────
app.use('/admin', requireSession)
app.use('/api',   requireSession)

// ── Helpers JSON ──────────────────────────────────────────────────────────────
function readNovenas()      { return JSON.parse(fs.readFileSync(NOVENAS_PATH, 'utf-8')) }
function writeNovenas(data) { fs.writeFileSync(NOVENAS_PATH, JSON.stringify(data, null, 2), 'utf-8') }

// ── API REST ──────────────────────────────────────────────────────────────────
app.get('/api/novenas', (req, res) => {
  res.json(readNovenas())
})

app.post('/api/novenas', (req, res) => {
  const novenas = readNovenas()
  const maxId = novenas.reduce((m, n) => Math.max(m, n.id), 0)
  const nueva = { ...req.body, id: maxId + 1, estado: req.body.estado || 'borrador' }
  novenas.push(nueva)
  writeNovenas(novenas)
  res.status(201).json(nueva)
})

app.put('/api/novenas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const novenas = readNovenas()
  const idx = novenas.findIndex(n => n.id === id)
  if (idx === -1) return res.status(404).json({ error: 'No encontrada' })
  novenas[idx] = { ...novenas[idx], ...req.body, id }
  writeNovenas(novenas)
  res.json(novenas[idx])
})

app.delete('/api/novenas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const novenas = readNovenas()
  const filtered = novenas.filter(n => n.id !== id)
  if (filtered.length === novenas.length) return res.status(404).json({ error: 'No encontrada' })
  writeNovenas(filtered)
  res.json({ ok: true })
})

// Panel
app.get('/admin', (req, res) => res.send(ADMIN_HTML))
app.get('/', (req, res) => res.redirect('/admin'))

// ── Arranque ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Panel Maná Admin`)
  console.log(`    http://localhost:${PORT}/admin`)
  console.log(`    Supabase: ${process.env.SUPABASE_URL}`)
  console.log(`    Modo: ${IS_PROD ? 'producción' : 'desarrollo'}\n`)
})

// ── Login page ────────────────────────────────────────────────────────────────
function loginPage(error = '') {
  return LOGIN_HTML.replace('<!--ERROR-->', error
    ? `<p class="error">${error}</p>` : '')
}

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maná Admin — Iniciar sesión</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0a0a14;color:#e5e5e5;font-family:system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#13131f;border:1px solid #2d2d4a;border-radius:12px;
        padding:40px;width:min(95vw,380px)}
  .logo{text-align:center;margin-bottom:32px}
  .logo h1{color:#c9a84c;font-size:1.4rem;font-weight:700}
  .logo p{color:#666;font-size:.8rem;margin-top:4px}
  label{display:block;font-size:.75rem;color:#999;text-transform:uppercase;
        letter-spacing:.06em;margin-bottom:5px;margin-top:18px}
  input{width:100%;padding:10px 14px;background:#0a0a14;border:1px solid #333;
        border-radius:8px;color:#e5e5e5;font-size:.9rem}
  input:focus{outline:none;border-color:#c9a84c}
  button{width:100%;margin-top:24px;padding:12px;background:#c9a84c;
         border:none;border-radius:8px;color:#13131f;font-weight:700;
         font-size:.9rem;cursor:pointer}
  button:hover{background:#d4b55e}
  .error{color:#e57373;font-size:.82rem;margin-top:14px;
         background:#1e1010;border:1px solid #5c2a2a;border-radius:6px;
         padding:8px 12px;text-align:center}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <h1>⛪ Maná Admin</h1>
    <p>Panel de administración de novenas</p>
  </div>
  <form method="POST" action="/admin/login">
    <label for="u">Usuario</label>
    <input id="u" name="username" type="text" autocomplete="username" required autofocus>
    <label for="p">Contraseña</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Iniciar sesión</button>
    <!--ERROR-->
  </form>
</div>
</body>
</html>`

// ── Admin panel HTML ──────────────────────────────────────────────────────────
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Maná — Admin Novenas</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e5e5e5; min-height: 100vh; }
  header { background: #1a1a2e; border-bottom: 1px solid #2d2d4a; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  header h1 { font-size: 1.2rem; color: #c9a84c; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .user-badge { font-size: .78rem; color: #888; background: #111; padding: 4px 10px; border-radius: 20px; border: 1px solid #2d2d2d; }
  .toolbar { display: flex; gap: 10px; padding: 16px 24px; background: #111; border-bottom: 1px solid #222; flex-wrap: wrap; align-items: center; }
  .toolbar select, .toolbar input { background: #1e1e1e; border: 1px solid #333; color: #e5e5e5; padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; }
  .toolbar select:focus, .toolbar input:focus { outline: none; border-color: #c9a84c; }
  .toolbar label { font-size: 0.8rem; color: #aaa; }
  .btn { padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer; font-size: 0.82rem; font-weight: 600; transition: opacity .15s; }
  .btn:hover { opacity: .8; }
  .btn-gold { background: #c9a84c; color: #1a1a2e; }
  .btn-danger { background: #c0392b; color: #fff; }
  .btn-secondary { background: #333; color: #e5e5e5; }
  .btn-success { background: #27ae60; color: #fff; }
  .btn-sm { padding: 4px 10px; font-size: .75rem; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
  .badge-pub { background: #27ae60; color: #fff; }
  .badge-bor { background: #555; color: #ccc; }
  .badge-cat { background: #2d2d4a; color: #9b88c7; }
  table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
  th { background: #1a1a2e; color: #c9a84c; text-align: left; padding: 10px 12px; position: sticky; top: 0; z-index: 1; font-size: 0.75rem; text-transform: uppercase; letter-spacing: .05em; }
  td { padding: 9px 12px; border-bottom: 1px solid #1e1e1e; vertical-align: middle; }
  tr:hover td { background: #1a1a1a; }
  .table-wrap { overflow-x: auto; flex: 1; }
  .actions { display: flex; gap: 6px; }
  .novena-name { font-weight: 500; max-width: 220px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .stats { padding: 8px 24px; background: #111; font-size: 0.78rem; color: #888; border-bottom: 1px solid #1e1e1e; }
  .layout { display: flex; flex-direction: column; height: 100vh; }
  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; align-items: center; justify-content: center; }
  .overlay.open { display: flex; }
  .modal { background: #1a1a1a; border: 1px solid #333; border-radius: 10px; width: min(95vw, 800px); max-height: 90vh; display: flex; flex-direction: column; }
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #2d2d2d; }
  .modal-header h2 { font-size: 1rem; color: #c9a84c; }
  .modal-body { overflow-y: auto; padding: 20px; display: grid; gap: 14px; grid-template-columns: 1fr 1fr; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field.full { grid-column: 1 / -1; }
  .field label { font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: .05em; }
  .field input, .field select, .field textarea { background: #0f0f0f; border: 1px solid #333; color: #e5e5e5; padding: 8px 10px; border-radius: 6px; font-size: 0.85rem; font-family: inherit; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: #c9a84c; }
  .field textarea.code { font-family: monospace; font-size: 0.78rem; min-height: 200px; resize: vertical; }
  .modal-footer { padding: 14px 20px; border-top: 1px solid #2d2d2d; display: flex; gap: 8px; justify-content: flex-end; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: #27ae60; color: white; padding: 10px 18px; border-radius: 8px; font-size: 0.85rem; z-index: 200; opacity: 0; transition: opacity .3s; pointer-events: none; }
  .toast.show { opacity: 1; }
  .toast.error { background: #c0392b; }
  .count-pill { background: #2d2d4a; color: #c9a84c; border-radius: 12px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700; }
  .json-error { color: #e57373; font-size: .75rem; margin-top: 4px; }
</style>
</head>
<body>
<div class="layout">
  <header>
    <h1>⛪ Maná — Admin Novenas</h1>
    <div class="header-right">
      <span class="user-badge" id="user-badge">—</span>
      <form method="POST" action="/admin/logout" style="margin:0">
        <button type="submit" class="btn btn-secondary btn-sm">Cerrar sesión</button>
      </form>
    </div>
  </header>
  <div class="toolbar">
    <label>Estado: <select id="filter-estado" onchange="renderTable()">
      <option value="">Todos</option>
      <option value="publicado">Publicado</option>
      <option value="borrador">Borrador</option>
    </select></label>
    <label>Categoría: <select id="filter-cat" onchange="renderTable()">
      <option value="">Todas</option>
      <option value="jesus">Jesús</option>
      <option value="maria">María</option>
      <option value="santos">Santos</option>
      <option value="angeles">Ángeles</option>
      <option value="especial">Especial</option>
    </select></label>
    <label><input type="text" id="filter-q" placeholder="Buscar..." oninput="renderTable()" style="width:200px"></label>
    <button class="btn btn-gold" onclick="openNew()">+ Nueva novena</button>
    <button class="btn btn-secondary" onclick="loadData()">↺ Recargar</button>
  </div>
  <div class="stats" id="stats"></div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Nombre</th><th>Santo</th><th>Estado</th>
          <th>Categoría</th><th>Festividad</th><th>Días</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
</div>

<div class="overlay" id="modal-overlay" onclick="closeModal(event)">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 id="modal-title">Editar novena</h2>
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="field"><label>Nombre</label><input id="f-nombre" type="text"></div>
      <div class="field"><label>Santo</label><input id="f-santo" type="text"></div>
      <div class="field"><label>Estado</label><select id="f-estado">
        <option value="publicado">Publicado</option>
        <option value="borrador">Borrador</option>
      </select></div>
      <div class="field"><label>Categoría</label><select id="f-categoria">
        <option value="jesus">Jesús</option>
        <option value="maria">María</option>
        <option value="santos">Santos</option>
        <option value="angeles">Ángeles</option>
        <option value="especial">Especial</option>
      </select></div>
      <div class="field"><label>Fecha de festividad</label><input id="f-fecha" type="text" placeholder="MM-DD o descripción"></div>
      <div class="field"><label>Intención sugerida</label><input id="f-intencion" type="text"></div>
      <div class="field full"><label>Descripción</label><textarea id="f-descripcion" rows="3" style="resize:vertical"></textarea></div>
      <div class="field full">
        <label>Días — JSON Array de {dia, titulo, reflexion, oracion}</label>
        <textarea id="f-dias" class="code"></textarea>
        <span class="json-error" id="json-error"></span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" id="btn-delete" onclick="deleteNovena()">Eliminar</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-success" onclick="saveNovena()">Guardar cambios</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let allNovenas = []
let editingId = null

// Mostrar usuario de la sesión (el nombre está en el HTML del server)
fetch('/api/novenas').then(r => {
  if (!r.ok) { document.getElementById('user-badge').textContent = 'no autenticado'; return }
  document.getElementById('user-badge').textContent = document.cookie.match(/user=([^;]+)/)?.[1] || 'admin'
})

async function loadData() {
  const r = await fetch('/api/novenas')
  if (!r.ok) { showToast('Error al cargar', true); return }
  allNovenas = await r.json()
  renderTable()
}

function renderTable() {
  const estado = document.getElementById('filter-estado').value
  const cat    = document.getElementById('filter-cat').value
  const q      = document.getElementById('filter-q').value.toLowerCase()

  let list = allNovenas
  if (estado) list = list.filter(n => n.estado === estado)
  if (cat)    list = list.filter(n => n.categoria === cat)
  if (q)      list = list.filter(n =>
    n.nombre.toLowerCase().includes(q) || n.santo.toLowerCase().includes(q))

  const pub = allNovenas.filter(n => n.estado === 'publicado').length
  const bor = allNovenas.filter(n => n.estado === 'borrador').length
  document.getElementById('stats').innerHTML =
    'Mostrando <strong>' + list.length + '</strong> de <strong>' + allNovenas.length + '</strong> — ' +
    '<span class="badge badge-pub">Publicadas: ' + pub + '</span> &nbsp;' +
    '<span class="badge badge-bor">Borradores: ' + bor + '</span>'

  document.getElementById('tbody').innerHTML = list.map(n => \`
    <tr>
      <td><span class="count-pill">\${n.id}</span></td>
      <td><div class="novena-name" title="\${n.nombre}">\${n.nombre}</div></td>
      <td style="color:#aaa;font-size:.8rem">\${n.santo}</td>
      <td><span class="badge \${n.estado==='publicado'?'badge-pub':'badge-bor'}">\${n.estado}</span></td>
      <td><span class="badge badge-cat">\${n.categoria||'—'}</span></td>
      <td style="font-size:.75rem;color:#888">\${n.fechaFestividad||'—'}</td>
      <td style="text-align:center">\${n.dias?.length||0}</td>
      <td><div class="actions">
        <button class="btn btn-gold btn-sm" onclick="openEdit(\${n.id})">Editar</button>
        <button class="btn btn-sm \${n.estado==='publicado'?'btn-secondary':'btn-success'}"
          onclick="toggleEstado(\${n.id})">\${n.estado==='publicado'?'Despublicar':'Publicar'}</button>
      </div></td>
    </tr>
  \`).join('')
}

function openEdit(id) {
  const n = allNovenas.find(x => x.id === id)
  editingId = id
  document.getElementById('modal-title').textContent = 'Editar: ' + n.nombre
  document.getElementById('btn-delete').style.display = ''
  document.getElementById('f-nombre').value     = n.nombre || ''
  document.getElementById('f-santo').value      = n.santo || ''
  document.getElementById('f-estado').value     = n.estado || 'borrador'
  document.getElementById('f-categoria').value  = n.categoria || 'santos'
  document.getElementById('f-fecha').value      = n.fechaFestividad || ''
  document.getElementById('f-intencion').value  = n.intencionSugerida || ''
  document.getElementById('f-descripcion').value= n.descripcion || ''
  document.getElementById('f-dias').value       = JSON.stringify(n.dias || [], null, 2)
  document.getElementById('json-error').textContent = ''
  document.getElementById('modal-overlay').classList.add('open')
}

function openNew() {
  editingId = null
  document.getElementById('modal-title').textContent = 'Nueva novena'
  document.getElementById('btn-delete').style.display = 'none'
  document.getElementById('f-nombre').value     = ''
  document.getElementById('f-santo').value      = ''
  document.getElementById('f-estado').value     = 'borrador'
  document.getElementById('f-categoria').value  = 'santos'
  document.getElementById('f-fecha').value      = ''
  document.getElementById('f-intencion').value  = ''
  document.getElementById('f-descripcion').value= ''
  document.getElementById('f-dias').value       = JSON.stringify(
    Array.from({length:9},(_,i)=>({dia:i+1,titulo:'Día '+(i+1),reflexion:'',oracion:''})), null, 2)
  document.getElementById('json-error').textContent = ''
  document.getElementById('modal-overlay').classList.add('open')
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return
  document.getElementById('modal-overlay').classList.remove('open')
}

async function saveNovena() {
  let dias
  try {
    dias = JSON.parse(document.getElementById('f-dias').value)
    document.getElementById('json-error').textContent = ''
  } catch(e) {
    document.getElementById('json-error').textContent = 'JSON inválido: ' + e.message
    return
  }

  const data = {
    nombre:           document.getElementById('f-nombre').value.trim(),
    santo:            document.getElementById('f-santo').value.trim(),
    estado:           document.getElementById('f-estado').value,
    categoria:        document.getElementById('f-categoria').value,
    fechaFestividad:  document.getElementById('f-fecha').value.trim() || null,
    intencionSugerida:document.getElementById('f-intencion').value.trim(),
    descripcion:      document.getElementById('f-descripcion').value.trim(),
    dias,
  }

  const url    = editingId ? '/api/novenas/' + editingId : '/api/novenas'
  const method = editingId ? 'PUT' : 'POST'
  const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) })
  if (!r.ok) { showToast('Error al guardar', true); return }
  document.getElementById('modal-overlay').classList.remove('open')
  showToast('Guardado ✓')
  await loadData()
}

async function deleteNovena() {
  if (!editingId) return
  const n = allNovenas.find(x => x.id === editingId)
  if (!confirm('¿Eliminar "' + n.nombre + '"? Esta acción no se puede deshacer.')) return
  const r = await fetch('/api/novenas/' + editingId, { method: 'DELETE' })
  if (!r.ok) { showToast('Error al eliminar', true); return }
  document.getElementById('modal-overlay').classList.remove('open')
  showToast('Eliminada')
  await loadData()
}

async function toggleEstado(id) {
  const n = allNovenas.find(x => x.id === id)
  const r = await fetch('/api/novenas/' + id, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ ...n, estado: n.estado === 'publicado' ? 'borrador' : 'publicado' })
  })
  if (!r.ok) { showToast('Error', true); return }
  showToast(n.estado === 'publicado' ? 'Movida a borrador' : 'Publicada ✓')
  await loadData()
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.className = 'toast show' + (isError ? ' error' : '')
  setTimeout(() => t.className = 'toast', 2500)
}

loadData()
</script>
</body>
</html>`
