-- =====================================================================
-- MIGRACION: Limpieza final de datos legacy en ubicacion + hardening
-- Fecha: 2026-03-14
-- Alcance: Inventario / Ubicaciones
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Backfill final por codigo textual (PROD-XXXX o numero)
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
-- 2) Eliminar ubicaciones legacy sin producto real y sin uso operativo
-- ---------------------------------------------------------------------
DELETE FROM public.ubicacion u
WHERE u.cod_producto IS NULL
  AND COALESCE(u.estado_ubi, 'INACTIVA') = 'INACTIVA'
  AND NOT EXISTS (
    SELECT 1 FROM public.inventario i
    WHERE i.cod_ubicacion = u.cod_ubicacion
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.producto p
    WHERE p.cod_ubicacion = u.cod_ubicacion
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.baja_inventario b
    WHERE b.cod_ubicacion = u.cod_ubicacion
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.conteo_inventario_detalle cd
    WHERE cd.cod_ubicacion = u.cod_ubicacion
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.reserva_inventario r
    WHERE r.cod_ubicacion = u.cod_ubicacion
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.transferencia_inventario t
    WHERE t.cod_ubicacion_origen = u.cod_ubicacion
       OR t.cod_ubicacion_destino = u.cod_ubicacion
  );

-- ---------------------------------------------------------------------
-- 3) Bloqueo de seguridad si aun quedan registros no mapeados
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_pendientes INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_pendientes
  FROM public.ubicacion
  WHERE cod_producto IS NULL;

  IF v_pendientes > 0 THEN
    RAISE EXCEPTION 'Limpieza incompleta: quedan % ubicaciones sin cod_producto', v_pendientes;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) Hardening de columnas + consistencia codigo textual
-- ---------------------------------------------------------------------
ALTER TABLE public.ubicacion
  ALTER COLUMN cod_producto SET NOT NULL,
  ALTER COLUMN codigo_producto SET NOT NULL;

ALTER TABLE public.ubicacion
  DROP CONSTRAINT IF EXISTS ck_ubicacion_codigo_producto_consistente;

ALTER TABLE public.ubicacion
  ADD CONSTRAINT ck_ubicacion_codigo_producto_consistente
  CHECK (codigo_producto = UPPER(CONCAT('PROD-', LPAD(cod_producto::text, 4, '0'))));

COMMIT;
