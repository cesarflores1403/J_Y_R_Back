-- =====================================================================
-- MIGRACION: Reactivar ubicaciones con inventario operativo
-- Fecha: 2026-03-15
-- Alcance: Inventario / Ubicaciones
-- Objetivo:
--   Evitar inconsistencia operativa: ubicaciones INACTIVAS con stock/reserva.
--   Una ubicacion con inventario operativo debe estar ACTIVA.
-- =====================================================================

BEGIN;

UPDATE public.ubicacion u
SET estado_ubi = 'ACTIVA'
WHERE UPPER(COALESCE(u.estado_ubi, 'ACTIVA')) NOT IN ('ACTIVA', 'ACTIVO', '1', 'TRUE')
  AND EXISTS (
    SELECT 1
    FROM public.inventario i
    WHERE i.cod_ubicacion = u.cod_ubicacion
      AND (
        COALESCE(i.stock, 0) > 0
        OR COALESCE(i.stock_reservado, 0) > 0
      )
  );

COMMIT;
