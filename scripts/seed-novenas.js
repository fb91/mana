#!/usr/bin/env node
/**
 * Seed: importa novenas.json a Supabase (corre una sola vez)
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   node scripts/seed-novenas.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL             = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const novenasPath = path.join(__dirname, '../frontend/src/data/novenas.json')
const novenas = JSON.parse(fs.readFileSync(novenasPath, 'utf8'))

async function seed() {
  console.log(`Importando ${novenas.length} novenas...`)
  let ok = 0
  let err = 0

  for (const novena of novenas) {
    // 1. Insertar novena (sin los días)
    const { data: inserted, error: nErr } = await supabase
      .from('novenas')
      .insert({
        nombre:             novena.nombre,
        santo:              novena.santo,
        descripcion:        novena.descripcion   ?? null,
        intencion_sugerida: novena.intencionSugerida ?? null,
        autor:              novena.autor          ?? null,
        estado:             novena.estado         ?? 'activa',
        categoria:          novena.categoria      ?? null,
        fecha_festividad:   novena.fechaFestividad ?? null,
        published:          true,   // el JSON actual = contenido aprobado
      })
      .select('id')
      .single()

    if (nErr) {
      console.error(`  ✗ ${novena.nombre}:`, nErr.message)
      err++
      continue
    }

    // 2. Insertar los 9 días
    if (novena.dias?.length) {
      const dias = novena.dias.map(d => ({
        novena_id: inserted.id,
        dia:       d.dia,
        titulo:    d.titulo    ?? null,
        oracion:   d.oracion,
        reflexion: d.reflexion ?? null,
      }))

      const { error: dErr } = await supabase.from('novena_dias').insert(dias)
      if (dErr) {
        console.error(`  ✗ Días de "${novena.nombre}":`, dErr.message)
        err++
        continue
      }
    }

    console.log(`  ✓ ${novena.nombre}`)
    ok++
  }

  console.log(`\nListo: ${ok} importadas, ${err} errores.`)

  if (ok > 0) {
    // Actualizar content_versions para que los clientes sepan que hay datos
    await supabase
      .from('content_versions')
      .upsert({ content_type: 'novenas', version: `seed-${Date.now()}`, updated_at: new Date().toISOString() })
    console.log('content_versions actualizado.')
  }
}

seed().catch(e => { console.error(e); process.exit(1) })
