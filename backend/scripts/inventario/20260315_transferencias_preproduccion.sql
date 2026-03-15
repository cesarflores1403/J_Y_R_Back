-- =====================================================================
-- MIGRACION INVENTARIO - TRANSFERENCIAS (PREPRODUCCION)
-- Fecha: 2026-03-15
-- Alcance: SOLO submodulo Inventario/Transferencias
-- =====================================================================

BEGIN;

-- 1) Auditoria minima de anulacion en cabecera de transferencia
ALTER TABLE public.transferencia_inventario
  ADD COLUMN IF NOT EXISTS fecha_anulacion timestamp without time zone,
  ADD COLUMN IF NOT EXISTS cod_usuario_anulacion integer,
  ADD COLUMN IF NOT EXISTS cod_movimiento_salida_anulacion integer,
  ADD COLUMN IF NOT EXISTS cod_movimiento_entrada_anulacion integer;

-- 2) Normalizacion de estado legacy (evita nulos antes de restricciones/reportes)
UPDATE public.transferencia_inventario
SET estado = 'COMPLETADA'
WHERE estado IS NULL;

-- 3) FK de usuario de anulacion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_transferencia_usuario_anulacion'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_usuario_anulacion
      FOREIGN KEY (cod_usuario_anulacion)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4) FK de movimientos de anulacion (si movimiento_inventario tiene PK cod_movimiento)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'movimiento_inventario'
      AND column_name = 'cod_movimiento'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_transferencia_mov_salida_anulacion'
    ) THEN
      ALTER TABLE public.transferencia_inventario
        ADD CONSTRAINT fk_transferencia_mov_salida_anulacion
        FOREIGN KEY (cod_movimiento_salida_anulacion)
        REFERENCES public.movimiento_inventario(cod_movimiento)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_transferencia_mov_entrada_anulacion'
    ) THEN
      ALTER TABLE public.transferencia_inventario
        ADD CONSTRAINT fk_transferencia_mov_entrada_anulacion
        FOREIGN KEY (cod_movimiento_entrada_anulacion)
        REFERENCES public.movimiento_inventario(cod_movimiento)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 5) Indices operativos para listado y auditoria
CREATE INDEX IF NOT EXISTS idx_transferencia_estado_fecha
  ON public.transferencia_inventario (estado, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_transferencia_fecha_anulacion
  ON public.transferencia_inventario (fecha_anulacion DESC);

CREATE INDEX IF NOT EXISTS idx_transferencia_usuario_anulacion
  ON public.transferencia_inventario (cod_usuario_anulacion);

COMMIT;
