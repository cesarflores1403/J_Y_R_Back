-- =====================================================================
-- MIGRACION: ubicacion.codigo_qr -> ubicacion.codigo_producto
-- Fecha: 2026-03-14
-- Alcance: Inventario / Ubicaciones
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Renombrar columna si solo existe codigo_qr
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_qr'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_producto'
  ) THEN
    ALTER TABLE public.ubicacion
      RENAME COLUMN codigo_qr TO codigo_producto;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Si ambas columnas existen, migrar datos faltantes y eliminar legacy
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_qr'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_producto'
  ) THEN
    UPDATE public.ubicacion
    SET codigo_producto = COALESCE(NULLIF(TRIM(codigo_producto), ''), codigo_qr)
    WHERE (codigo_producto IS NULL OR TRIM(codigo_producto) = '')
      AND codigo_qr IS NOT NULL;

    ALTER TABLE public.ubicacion
      DROP COLUMN codigo_qr;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) Normalizar constraint/index para codigo_producto
-- ---------------------------------------------------------------------
ALTER TABLE public.ubicacion
  DROP CONSTRAINT IF EXISTS ubicacion_codigo_qr_key,
  DROP CONSTRAINT IF EXISTS uq_ubicacion_codigo_qr,
  DROP CONSTRAINT IF EXISTS uq_ubicacion_codigo_producto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_producto'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_ubicacion_codigo_producto'
  ) THEN
    ALTER TABLE public.ubicacion
      ADD CONSTRAINT uq_ubicacion_codigo_producto UNIQUE (codigo_producto);
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_ubicacion_codigo_qr;
DROP INDEX IF EXISTS public.idx_ubicacion_codigo_producto;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ubicacion'
      AND column_name = 'codigo_producto'
  ) THEN
    CREATE INDEX idx_ubicacion_codigo_producto
      ON public.ubicacion (codigo_producto);
  END IF;
END $$;

COMMIT;
