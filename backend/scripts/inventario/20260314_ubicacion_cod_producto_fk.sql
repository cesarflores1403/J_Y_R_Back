-- =====================================================================
-- MIGRACION: Integridad referencial gradual para ubicacion -> producto
-- Fecha: 2026-03-14
-- Alcance: Inventario / Ubicaciones
-- Nota:
--   No fuerza NOT NULL para no romper datos legacy no mapeables hoy.
--   Desde backend, nuevas altas/ediciones ya exigen producto real.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Columna FK opcional para producto real
-- ---------------------------------------------------------------------
ALTER TABLE public.ubicacion
  ADD COLUMN IF NOT EXISTS cod_producto INTEGER;

-- ---------------------------------------------------------------------
-- 2) Remover unicidad sobre codigo_producto (ahora puede repetirse por multibodega)
-- ---------------------------------------------------------------------
ALTER TABLE public.ubicacion
  DROP CONSTRAINT IF EXISTS ubicacion_codigo_qr_key,
  DROP CONSTRAINT IF EXISTS uq_ubicacion_codigo_qr,
  DROP CONSTRAINT IF EXISTS uq_ubicacion_codigo_producto;

-- ---------------------------------------------------------------------
-- 3) Backfill directo desde codigo_producto (PROD-0001 o 1)
-- ---------------------------------------------------------------------
UPDATE public.ubicacion u
SET
  cod_producto = p.cod_producto,
  codigo_producto = UPPER(CONCAT('PROD-', LPAD(p.cod_producto::text, 4, '0')))
FROM public.producto p
WHERE (
  UPPER(TRIM(COALESCE(u.codigo_producto, ''))) = UPPER(CONCAT('PROD-', LPAD(p.cod_producto::text, 4, '0')))
  OR TRIM(COALESCE(u.codigo_producto, '')) = p.cod_producto::text
)
AND (
  u.cod_producto IS DISTINCT FROM p.cod_producto
  OR u.codigo_producto IS DISTINCT FROM UPPER(CONCAT('PROD-', LPAD(p.cod_producto::text, 4, '0')))
);

-- ---------------------------------------------------------------------
-- 4) Backfill fallback desde inventario (producto con mayor stock por ubicacion)
-- ---------------------------------------------------------------------
WITH ranking AS (
  SELECT
    i.cod_ubicacion,
    i.cod_producto,
    ROW_NUMBER() OVER (
      PARTITION BY i.cod_ubicacion
      ORDER BY i.stock DESC, i.cod_producto ASC
    ) AS rn
  FROM public.inventario i
)
UPDATE public.ubicacion u
SET cod_producto = r.cod_producto
FROM ranking r
WHERE u.cod_ubicacion = r.cod_ubicacion
  AND r.rn = 1
  AND u.cod_producto IS NULL;

-- Normaliza codigo textual cuando ya hay cod_producto resuelto
UPDATE public.ubicacion u
SET codigo_producto = UPPER(CONCAT('PROD-', LPAD(u.cod_producto::text, 4, '0')))
WHERE u.cod_producto IS NOT NULL
  AND u.codigo_producto IS DISTINCT FROM UPPER(CONCAT('PROD-', LPAD(u.cod_producto::text, 4, '0')));

-- ---------------------------------------------------------------------
-- 5) FK referencial (nullable) + indice
-- ---------------------------------------------------------------------
ALTER TABLE public.ubicacion
  DROP CONSTRAINT IF EXISTS fk_ubicacion_cod_producto;

ALTER TABLE public.ubicacion
  ADD CONSTRAINT fk_ubicacion_cod_producto
  FOREIGN KEY (cod_producto)
  REFERENCES public.producto(cod_producto)
  ON UPDATE RESTRICT
  ON DELETE RESTRICT;

DROP INDEX IF EXISTS public.idx_ubicacion_cod_producto;
CREATE INDEX idx_ubicacion_cod_producto ON public.ubicacion (cod_producto);

COMMIT;
