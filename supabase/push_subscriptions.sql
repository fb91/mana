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

-- Índice para la query del cron (busca por hora)
CREATE INDEX IF NOT EXISTS idx_push_hora
  ON push_subscriptions (hora_notificacion);

-- Row Level Security: la tabla solo se accede desde el backend con service_role
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: solo el rol service_role puede leer/escribir (las funciones de Vercel)
CREATE POLICY "Solo service role" ON push_subscriptions
  USING (false)
  WITH CHECK (false);
