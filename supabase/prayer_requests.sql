-- Migration: prayer_requests
-- Tabla para pedidos de oración comunitarios
-- Los pedidos son anónimos (solo nombre de pila) y visibles por 7 días

CREATE TABLE IF NOT EXISTS prayer_requests (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  motivo     text        NOT NULL,
  nombre     text        NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario anónimo puede insertar un pedido
CREATE POLICY "public insert prayer_requests"
  ON prayer_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Solo se pueden leer pedidos de los últimos 7 días
CREATE POLICY "public read recent prayer_requests"
  ON prayer_requests
  FOR SELECT
  TO anon
  USING (created_at > now() - interval '7 days');
