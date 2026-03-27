-- ============================================================
-- Sincronización de datos de usuario autenticado con Google
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Tabla principal de datos sincronizados ────────────────────
CREATE TABLE IF NOT EXISTS user_data (
  user_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  novenas_progreso       JSONB NOT NULL DEFAULT '[]',
  plan_espiritual        JSONB,
  saved_citations        JSONB NOT NULL DEFAULT '[]',
  last_bible_path        TEXT,
  pinned_books           JSONB NOT NULL DEFAULT '[]',
  recent_recommendations JSONB NOT NULL DEFAULT '[]',
  estado_de_vida         TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para mantener updated_at al día en cada UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_data_updated_at ON user_data;
CREATE TRIGGER user_data_updated_at
  BEFORE UPDATE ON user_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security: cada usuario solo accede a su propia fila
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios datos"
  ON user_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus propios datos"
  ON user_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios actualizan sus propios datos"
  ON user_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
