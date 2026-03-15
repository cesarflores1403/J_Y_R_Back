-- =====================================================================
-- MIGRACION INVENTARIO - SUBMODULO BAJAS
-- Fecha: 2026-03-15
-- Alcance: SOLO modulo Inventario (Bajas)
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) Tabla baja_inventario con trazabilidad de anulacion
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.baja_inventario (
  cod_baja_inventario serial PRIMARY KEY,
  cod_producto integer NOT NULL,
  cod_ubicacion integer NOT NULL,
  cod_usuario integer,
  cantidad integer NOT NULL,
  motivo character varying(120),
  descripcion character varying(500),
  referencia character varying(200),
  estado character varying(20) NOT NULL DEFAULT 'ACTIVA',
  fecha timestamp without time zone NOT NULL DEFAULT NOW(),
  fecha_anulacion timestamp without time zone,
  cod_usuario_anulacion integer,
  cod_movimiento_baja integer,
  cod_movimiento_anulacion integer
);

ALTER TABLE public.baja_inventario
  ADD COLUMN IF NOT EXISTS cod_producto integer,
  ADD COLUMN IF NOT EXISTS cod_ubicacion integer,
  ADD COLUMN IF NOT EXISTS cod_usuario integer,
  ADD COLUMN IF NOT EXISTS cantidad integer,
  ADD COLUMN IF NOT EXISTS motivo character varying(120),
  ADD COLUMN IF NOT EXISTS descripcion character varying(500),
  ADD COLUMN IF NOT EXISTS referencia character varying(200),
  ADD COLUMN IF NOT EXISTS estado character varying(20),
  ADD COLUMN IF NOT EXISTS fecha timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_anulacion timestamp without time zone,
  ADD COLUMN IF NOT EXISTS cod_usuario_anulacion integer,
  ADD COLUMN IF NOT EXISTS cod_movimiento_baja integer,
  ADD COLUMN IF NOT EXISTS cod_movimiento_anulacion integer;

ALTER TABLE public.baja_inventario
  ALTER COLUMN estado SET DEFAULT 'ACTIVA',
  ALTER COLUMN fecha SET DEFAULT NOW();

UPDATE public.baja_inventario
SET
  cantidad = GREATEST(COALESCE(cantidad, 1), 1),
  estado = COALESCE(NULLIF(UPPER(TRIM(estado)), ''), 'ACTIVA');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_baja_inventario_cantidad_pos'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT ck_baja_inventario_cantidad_pos
      CHECK (cantidad > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_baja_inventario_estado'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT ck_baja_inventario_estado
      CHECK (estado IN ('ACTIVA', 'ANULADA'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_producto'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT fk_baja_inventario_producto
      FOREIGN KEY (cod_producto)
      REFERENCES public.producto(cod_producto)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_ubicacion'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT fk_baja_inventario_ubicacion
      FOREIGN KEY (cod_ubicacion)
      REFERENCES public.ubicacion(cod_ubicacion)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_usuario'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT fk_baja_inventario_usuario
      FOREIGN KEY (cod_usuario)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_usuario_anulacion'
  ) THEN
    ALTER TABLE public.baja_inventario
      ADD CONSTRAINT fk_baja_inventario_usuario_anulacion
      FOREIGN KEY (cod_usuario_anulacion)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
DECLARE
  v_mov_pk_col text;
BEGIN
  SELECT a.attname
  INTO v_mov_pk_col
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
  WHERE n.nspname='public'
    AND t.relname='movimiento_inventario'
    AND c.contype='p'
  ORDER BY cols.ord
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_mov_baja'
  ) AND v_mov_pk_col IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.baja_inventario
         ADD CONSTRAINT fk_baja_inventario_mov_baja
         FOREIGN KEY (cod_movimiento_baja)
         REFERENCES public.movimiento_inventario(%I)
         ON UPDATE CASCADE
         ON DELETE SET NULL
         NOT VALID',
      v_mov_pk_col
    );
  END IF;
END $$;

DO $$
DECLARE
  v_mov_pk_col text;
BEGIN
  SELECT a.attname
  INTO v_mov_pk_col
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON TRUE
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
  WHERE n.nspname='public'
    AND t.relname='movimiento_inventario'
    AND c.contype='p'
  ORDER BY cols.ord
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_baja_inventario_mov_anulacion'
  ) AND v_mov_pk_col IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.baja_inventario
         ADD CONSTRAINT fk_baja_inventario_mov_anulacion
         FOREIGN KEY (cod_movimiento_anulacion)
         REFERENCES public.movimiento_inventario(%I)
         ON UPDATE CASCADE
         ON DELETE SET NULL
         NOT VALID',
      v_mov_pk_col
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_baja_inventario_fecha
  ON public.baja_inventario (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_baja_inventario_estado_fecha
  ON public.baja_inventario (estado, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_baja_inventario_producto_ubicacion
  ON public.baja_inventario (cod_producto, cod_ubicacion);

CREATE UNIQUE INDEX IF NOT EXISTS idx_baja_inventario_mov_baja_unq
  ON public.baja_inventario (cod_movimiento_baja)
  WHERE cod_movimiento_baja IS NOT NULL;

COMMIT;
