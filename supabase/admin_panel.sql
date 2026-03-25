-- ============================================================
-- PANEL DE ADMINISTRACIÓN — Migrations
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES (roles de usuario) ───────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role  TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin', 'contributor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-crear perfil cuando se registra un usuario en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven su propio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);
-- Solo service_role puede modificar roles (desde el dashboard de Supabase)


-- ── 2. VERSIONES DE BIBLIA ────────────────────────────────────
-- Preparado para múltiples versiones/traducciones en el futuro
CREATE TABLE IF NOT EXISTS bible_versions (
  id          TEXT PRIMARY KEY,          -- e.g. 'lpd-1990-ar'
  nombre      TEXT NOT NULL,             -- 'El libro del pueblo de Dios (1990)'
  descripcion TEXT,
  editorial   TEXT,                      -- 'Librería Editrice Vaticana'
  traducion   TEXT,                      -- 'Argentina'
  anio        INT,                       -- 1990
  idioma      TEXT NOT NULL DEFAULT 'es',
  activa      BOOLEAN NOT NULL DEFAULT true,  -- versión default de la app
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO bible_versions (id, nombre, descripcion, editorial, traducion, anio, idioma, activa)
VALUES (
  'lpd-1990-ar',
  'El libro del pueblo de Dios',
  'Traducción argentina de la Biblia completa, edición de 1990.',
  'Librería Editrice Vaticana',
  'Argentina',
  1990,
  'es',
  true
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE bible_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede leer versiones de biblia"
  ON bible_versions FOR SELECT USING (true);


-- ── 3. CORRECCIONES DE BIBLIA ─────────────────────────────────
-- Override de versículos puntuales, asociados a una versión específica
CREATE TABLE IF NOT EXISTS bible_corrections (
  id             BIGSERIAL PRIMARY KEY,
  bible_version  TEXT NOT NULL REFERENCES bible_versions(id) DEFAULT 'lpd-1990-ar',
  book_id        TEXT NOT NULL,   -- e.g. 'GEN', 'MAT'
  chapter        INT  NOT NULL,
  verse          INT  NOT NULL,
  texto_original TEXT,            -- para referencia / historial
  texto_corregido TEXT NOT NULL,
  motivo         TEXT,
  published      BOOLEAN NOT NULL DEFAULT false,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bible_version, book_id, chapter, verse)
);

ALTER TABLE bible_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Correcciones publicadas son públicas"
  ON bible_corrections FOR SELECT USING (published = true);
CREATE POLICY "Contributors pueden ver todas"
  ON bible_corrections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Contributors pueden insertar"
  ON bible_corrections FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Solo admin puede publicar"
  ON bible_corrections FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));


-- ── 4. NOVENAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS novenas (
  id                 BIGSERIAL PRIMARY KEY,
  nombre             TEXT NOT NULL,
  santo              TEXT NOT NULL,
  descripcion        TEXT,
  intencion_sugerida TEXT,
  autor              TEXT,
  estado             TEXT NOT NULL DEFAULT 'activa',
  categoria          TEXT,
  fecha_festividad   DATE,
  published          BOOLEAN NOT NULL DEFAULT false,
  created_by         UUID REFERENCES auth.users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS novena_dias (
  id        BIGSERIAL PRIMARY KEY,
  novena_id BIGINT NOT NULL REFERENCES novenas(id) ON DELETE CASCADE,
  dia       INT    NOT NULL CHECK (dia BETWEEN 1 AND 9),
  titulo    TEXT,
  oracion   TEXT   NOT NULL,
  reflexion TEXT,
  UNIQUE (novena_id, dia)
);

ALTER TABLE novenas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Novenas publicadas son públicas"
  ON novenas FOR SELECT USING (published = true);
CREATE POLICY "Contributors ven todas las novenas"
  ON novenas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Contributors pueden insertar novenas"
  ON novenas FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Contributors pueden editar novenas"
  ON novenas FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Solo admin puede eliminar novenas"
  ON novenas FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

ALTER TABLE novena_dias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Días de novenas publicadas son públicos"
  ON novena_dias FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM novenas WHERE id = novena_id AND published = true
  ));
CREATE POLICY "Contributors ven todos los días"
  ON novena_dias FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));
CREATE POLICY "Contributors pueden gestionar días"
  ON novena_dias FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','contributor')
  ));


-- ── 5. VERSIONES DE CONTENIDO (para el check de updates) ──────
CREATE TABLE IF NOT EXISTS content_versions (
  content_type TEXT PRIMARY KEY,  -- 'novenas', 'bible_corrections'
  version      TEXT NOT NULL,     -- hash o timestamp
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO content_versions (content_type, version) VALUES
  ('novenas', 'seed-initial'),
  ('bible_corrections', 'seed-initial')
ON CONFLICT (content_type) DO NOTHING;

ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cualquiera puede leer versiones"
  ON content_versions FOR SELECT USING (true);


-- ── 6. AUDIT LOG ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL,   -- 'novena', 'novena_dia', 'bible_correction'
  entity_id    BIGINT,
  action       TEXT NOT NULL,   -- 'create', 'update', 'delete', 'publish'
  changes      JSONB,           -- { before: {...}, after: {...} }
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo admins pueden ver el audit log"
  ON content_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
-- La inserción se hace desde server-side (service_role), no desde el cliente
