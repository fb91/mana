-- Migración: tabla para Web Push subscriptions de novenas
-- Ejecutar en: Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint      text        NOT NULL,
  novena_id     integer     NOT NULL,
  novena_nombre text        NOT NULL,
  hora_notificacion text    NOT NULL,  -- formato "HH:MM" hora de Buenos Aires
  subscription  jsonb       NOT NULL,  -- objeto PushSubscription completo del browser
  url           text,                  -- ruta a la que navega al tocar la notificación
  titulo        text,                  -- título que muestra la notificación
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  UNIQUE(endpoint, novena_id)
);

-- Migración incremental: agregar columnas url y titulo si no existen
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS url    text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS titulo text;

-- Backfill registros existentes del asistente espiritual (novena_id = -1)
UPDATE push_subscriptions
SET
  url    = '/asistente',
  titulo = 'Maná — Asistente Espiritual'
WHERE novena_id = -1
  AND url IS NULL;

-- Backfill registros existentes de novenas (novena_id >= 0)
-- Reconstruye la url a partir del nombre ya almacenado, igual que hacía el servidor antes
UPDATE push_subscriptions
SET
  url    = '/novenas/' || lower(
              regexp_replace(
                regexp_replace(
                  translate(novena_nombre,
                    'áéíóúàèìòùäëïöüÁÉÍÓÚÀÈÌÒÙÄËÏÖÜñÑ',
                    'aeiouaeiouaeiouAEIOUAEIOUAEIOUnnN'
                  ),
                  '[^a-zA-Z0-9\s-]', '', 'g'
                ),
                '\s+', '-', 'g'
              )
           ),
  titulo = 'Maná — Recordatorio de Novena'
WHERE novena_id >= 0
  AND url IS NULL;

-- Índice para la query del cron (busca por hora)
CREATE INDEX IF NOT EXISTS idx_push_hora
  ON push_subscriptions (hora_notificacion);

-- Row Level Security: la tabla solo se accede desde el backend con service_role
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: solo el rol service_role puede leer/escribir (las funciones de Vercel)
CREATE POLICY "Solo service role" ON push_subscriptions
  USING (false)
  WITH CHECK (false);
