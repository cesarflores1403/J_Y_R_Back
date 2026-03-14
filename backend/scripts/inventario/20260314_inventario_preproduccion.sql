-- =====================================================================
-- MIGRACION INVENTARIO PREPRODUCCION
-- Fecha: 2026-03-14
-- Alcance: SOLO modulo Inventario
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1) Fortalecer integridad de inventario base
-- =====================================================================

-- Normalizacion defensiva para evitar que fallen constraints nuevas.
UPDATE public.inventario
SET
  stock = GREATEST(COALESCE(stock, 0), 0),
  stock_reservado = GREATEST(LEAST(COALESCE(stock_reservado, 0), GREATEST(COALESCE(stock, 0), 0)), 0),
  stock_minimo = GREATEST(COALESCE(stock_minimo, 0), 0),
  stock_maximo = GREATEST(COALESCE(stock_maximo, 0), 0);

UPDATE public.inventario
SET stock_maximo = stock_minimo
WHERE stock_maximo < stock_minimo;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_inv_stock_reservado_le_stock'
  ) THEN
    ALTER TABLE public.inventario
      ADD CONSTRAINT ck_inv_stock_reservado_le_stock
      CHECK (stock_reservado <= stock);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_inv_min_le_max'
  ) THEN
    ALTER TABLE public.inventario
      ADD CONSTRAINT ck_inv_min_le_max
      CHECK (stock_minimo <= stock_maximo);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventario_fecha_ult_mov
  ON public.inventario (fecha_ult_mov DESC);

-- =====================================================================
-- 2) Completar kardex (movimiento_inventario) para trazabilidad real
-- =====================================================================

ALTER TABLE public.movimiento_inventario
  ADD COLUMN IF NOT EXISTS cod_usuario integer,
  ADD COLUMN IF NOT EXISTS referencia_documento character varying(200),
  ADD COLUMN IF NOT EXISTS observaciones character varying(500);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_mov_inv_usuario'
  ) THEN
    ALTER TABLE public.movimiento_inventario
      ADD CONSTRAINT fk_mov_inv_usuario
      FOREIGN KEY (cod_usuario)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mov_inv_tipo_fecha
  ON public.movimiento_inventario (tipo, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_mov_inv_ref_tipo_ref_id
  ON public.movimiento_inventario (ref_tipo, ref_id);

CREATE INDEX IF NOT EXISTS idx_mov_inv_referencia_documento
  ON public.movimiento_inventario (referencia_documento);

CREATE INDEX IF NOT EXISTS idx_mov_inv_cod_usuario
  ON public.movimiento_inventario (cod_usuario);

-- =====================================================================
-- 3) Submodulo Reservas: persistencia y seguimiento
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.reserva_inventario (
  cod_reserva_inventario serial PRIMARY KEY,
  cod_inventario integer NOT NULL,
  cod_producto integer NOT NULL,
  cod_ubicacion integer NOT NULL,
  cantidad integer NOT NULL,
  estado character varying(20) NOT NULL DEFAULT 'ACTIVA',
  referencia character varying(200),
  observaciones character varying(500),
  motivo_liberacion character varying(200),
  fecha_creacion timestamp without time zone NOT NULL DEFAULT NOW(),
  fecha_liberacion timestamp without time zone,
  fecha_consumo timestamp without time zone,
  cod_usuario_creacion integer,
  cod_usuario_liberacion integer,
  cod_usuario_consumo integer
);

ALTER TABLE public.reserva_inventario
  ADD COLUMN IF NOT EXISTS cod_inventario integer,
  ADD COLUMN IF NOT EXISTS cod_producto integer,
  ADD COLUMN IF NOT EXISTS cod_ubicacion integer,
  ADD COLUMN IF NOT EXISTS cantidad integer,
  ADD COLUMN IF NOT EXISTS estado character varying(20),
  ADD COLUMN IF NOT EXISTS referencia character varying(200),
  ADD COLUMN IF NOT EXISTS observaciones character varying(500),
  ADD COLUMN IF NOT EXISTS motivo_liberacion character varying(200),
  ADD COLUMN IF NOT EXISTS fecha_creacion timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_liberacion timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_consumo timestamp without time zone,
  ADD COLUMN IF NOT EXISTS cod_usuario_creacion integer,
  ADD COLUMN IF NOT EXISTS cod_usuario_liberacion integer,
  ADD COLUMN IF NOT EXISTS cod_usuario_consumo integer;

ALTER TABLE public.reserva_inventario
  ALTER COLUMN estado SET DEFAULT 'ACTIVA',
  ALTER COLUMN fecha_creacion SET DEFAULT NOW();

UPDATE public.reserva_inventario
SET estado = 'ACTIVA'
WHERE estado IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_reserva_cantidad_pos'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT ck_reserva_cantidad_pos
      CHECK (cantidad > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_reserva_estado'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT ck_reserva_estado
      CHECK (estado IN ('ACTIVA', 'LIBERADA', 'CONSUMIDA', 'ANULADA'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_inventario'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_inventario
      FOREIGN KEY (cod_inventario)
      REFERENCES public.inventario(cod_inventario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_producto'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_producto
      FOREIGN KEY (cod_producto)
      REFERENCES public.producto(cod_producto)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_ubicacion'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_ubicacion
      FOREIGN KEY (cod_ubicacion)
      REFERENCES public.ubicacion(cod_ubicacion)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_usuario_crea'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_usuario_crea
      FOREIGN KEY (cod_usuario_creacion)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_usuario_libera'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_usuario_libera
      FOREIGN KEY (cod_usuario_liberacion)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_reserva_inv_usuario_consume'
  ) THEN
    ALTER TABLE public.reserva_inventario
      ADD CONSTRAINT fk_reserva_inv_usuario_consume
      FOREIGN KEY (cod_usuario_consumo)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reserva_estado_fecha
  ON public.reserva_inventario (estado, fecha_creacion DESC);

CREATE INDEX IF NOT EXISTS idx_reserva_inventario
  ON public.reserva_inventario (cod_inventario);

CREATE INDEX IF NOT EXISTS idx_reserva_producto_ubicacion
  ON public.reserva_inventario (cod_producto, cod_ubicacion);

CREATE INDEX IF NOT EXISTS idx_reserva_usuario_creacion
  ON public.reserva_inventario (cod_usuario_creacion);

-- =====================================================================
-- 4) Submodulo Conteos: cabecera + detalle persistentes
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.conteo_inventario (
  cod_conteo_inventario serial PRIMARY KEY,
  estado character varying(20) NOT NULL DEFAULT 'ABIERTO',
  fecha_apertura timestamp without time zone NOT NULL DEFAULT NOW(),
  fecha_cierre timestamp without time zone,
  observaciones character varying(500),
  observaciones_cierre character varying(500),
  cod_usuario_apertura integer,
  cod_usuario_cierre integer
);

ALTER TABLE public.conteo_inventario
  ADD COLUMN IF NOT EXISTS estado character varying(20),
  ADD COLUMN IF NOT EXISTS fecha_apertura timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_cierre timestamp without time zone,
  ADD COLUMN IF NOT EXISTS observaciones character varying(500),
  ADD COLUMN IF NOT EXISTS observaciones_cierre character varying(500),
  ADD COLUMN IF NOT EXISTS cod_usuario_apertura integer,
  ADD COLUMN IF NOT EXISTS cod_usuario_cierre integer;

ALTER TABLE public.conteo_inventario
  ALTER COLUMN estado SET DEFAULT 'ABIERTO',
  ALTER COLUMN fecha_apertura SET DEFAULT NOW();

UPDATE public.conteo_inventario
SET estado = 'ABIERTO'
WHERE estado IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_conteo_estado'
  ) THEN
    ALTER TABLE public.conteo_inventario
      ADD CONSTRAINT ck_conteo_estado
      CHECK (estado IN ('ABIERTO', 'CERRADO', 'ANULADO'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_usuario_apertura'
  ) THEN
    ALTER TABLE public.conteo_inventario
      ADD CONSTRAINT fk_conteo_usuario_apertura
      FOREIGN KEY (cod_usuario_apertura)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_usuario_cierre'
  ) THEN
    ALTER TABLE public.conteo_inventario
      ADD CONSTRAINT fk_conteo_usuario_cierre
      FOREIGN KEY (cod_usuario_cierre)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conteo_estado_fecha
  ON public.conteo_inventario (estado, fecha_apertura DESC);

CREATE TABLE IF NOT EXISTS public.conteo_inventario_detalle (
  cod_conteo_detalle serial PRIMARY KEY,
  cod_conteo_inventario integer NOT NULL,
  cod_producto integer NOT NULL,
  cod_ubicacion integer NOT NULL,
  cod_inventario integer NOT NULL,
  stock_sistema integer NOT NULL DEFAULT 0,
  stock_fisico integer NOT NULL,
  diferencia integer NOT NULL DEFAULT 0,
  observaciones character varying(500),
  fecha_registro timestamp without time zone NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conteo_inventario_detalle
  ADD COLUMN IF NOT EXISTS cod_conteo_inventario integer,
  ADD COLUMN IF NOT EXISTS cod_producto integer,
  ADD COLUMN IF NOT EXISTS cod_ubicacion integer,
  ADD COLUMN IF NOT EXISTS cod_inventario integer,
  ADD COLUMN IF NOT EXISTS stock_sistema integer,
  ADD COLUMN IF NOT EXISTS stock_fisico integer,
  ADD COLUMN IF NOT EXISTS diferencia integer,
  ADD COLUMN IF NOT EXISTS observaciones character varying(500),
  ADD COLUMN IF NOT EXISTS fecha_registro timestamp without time zone;

ALTER TABLE public.conteo_inventario_detalle
  ALTER COLUMN stock_sistema SET DEFAULT 0,
  ALTER COLUMN diferencia SET DEFAULT 0,
  ALTER COLUMN fecha_registro SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_conteo_det_stock_sistema_no_neg'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT ck_conteo_det_stock_sistema_no_neg
      CHECK (stock_sistema >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_conteo_det_stock_fisico_no_neg'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT ck_conteo_det_stock_fisico_no_neg
      CHECK (stock_fisico >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_conteo_detalle'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT uq_conteo_detalle
      UNIQUE (cod_conteo_inventario, cod_producto, cod_ubicacion);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_det_conteo'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT fk_conteo_det_conteo
      FOREIGN KEY (cod_conteo_inventario)
      REFERENCES public.conteo_inventario(cod_conteo_inventario)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_det_producto'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT fk_conteo_det_producto
      FOREIGN KEY (cod_producto)
      REFERENCES public.producto(cod_producto)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_det_ubicacion'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT fk_conteo_det_ubicacion
      FOREIGN KEY (cod_ubicacion)
      REFERENCES public.ubicacion(cod_ubicacion)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conteo_det_inventario'
  ) THEN
    ALTER TABLE public.conteo_inventario_detalle
      ADD CONSTRAINT fk_conteo_det_inventario
      FOREIGN KEY (cod_inventario)
      REFERENCES public.inventario(cod_inventario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conteo_det_conteo
  ON public.conteo_inventario_detalle (cod_conteo_inventario);

CREATE INDEX IF NOT EXISTS idx_conteo_det_inventario
  ON public.conteo_inventario_detalle (cod_inventario);

CREATE INDEX IF NOT EXISTS idx_conteo_det_producto_ubicacion
  ON public.conteo_inventario_detalle (cod_producto, cod_ubicacion);

-- =====================================================================
-- 5) Submodulo Transferencias: cabecera persistente de la operacion
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.transferencia_inventario (
  cod_transferencia_inventario serial PRIMARY KEY,
  cod_producto integer NOT NULL,
  cod_inventario_origen integer NOT NULL,
  cod_inventario_destino integer NOT NULL,
  cod_ubicacion_origen integer NOT NULL,
  cod_ubicacion_destino integer NOT NULL,
  cod_usuario integer,
  cantidad integer NOT NULL,
  referencia character varying(200) NOT NULL,
  motivo character varying(120),
  observaciones character varying(500),
  estado character varying(20) NOT NULL DEFAULT 'COMPLETADA',
  fecha timestamp without time zone NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transferencia_inventario
  ADD COLUMN IF NOT EXISTS cod_producto integer,
  ADD COLUMN IF NOT EXISTS cod_inventario_origen integer,
  ADD COLUMN IF NOT EXISTS cod_inventario_destino integer,
  ADD COLUMN IF NOT EXISTS cod_ubicacion_origen integer,
  ADD COLUMN IF NOT EXISTS cod_ubicacion_destino integer,
  ADD COLUMN IF NOT EXISTS cod_usuario integer,
  ADD COLUMN IF NOT EXISTS cantidad integer,
  ADD COLUMN IF NOT EXISTS referencia character varying(200),
  ADD COLUMN IF NOT EXISTS motivo character varying(120),
  ADD COLUMN IF NOT EXISTS observaciones character varying(500),
  ADD COLUMN IF NOT EXISTS estado character varying(20),
  ADD COLUMN IF NOT EXISTS fecha timestamp without time zone;

ALTER TABLE public.transferencia_inventario
  ALTER COLUMN estado SET DEFAULT 'COMPLETADA',
  ALTER COLUMN fecha SET DEFAULT NOW();

UPDATE public.transferencia_inventario
SET estado = 'COMPLETADA'
WHERE estado IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_transferencia_cantidad_pos'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT ck_transferencia_cantidad_pos
      CHECK (cantidad > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_transferencia_estado'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT ck_transferencia_estado
      CHECK (estado IN ('COMPLETADA', 'ANULADA'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_transferencia_origen_destino_distintos'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT ck_transferencia_origen_destino_distintos
      CHECK (cod_ubicacion_origen <> cod_ubicacion_destino);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_producto'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_producto
      FOREIGN KEY (cod_producto)
      REFERENCES public.producto(cod_producto)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_inv_origen'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_inv_origen
      FOREIGN KEY (cod_inventario_origen)
      REFERENCES public.inventario(cod_inventario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_inv_destino'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_inv_destino
      FOREIGN KEY (cod_inventario_destino)
      REFERENCES public.inventario(cod_inventario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_ubicacion_origen'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_ubicacion_origen
      FOREIGN KEY (cod_ubicacion_origen)
      REFERENCES public.ubicacion(cod_ubicacion)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_ubicacion_destino'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_ubicacion_destino
      FOREIGN KEY (cod_ubicacion_destino)
      REFERENCES public.ubicacion(cod_ubicacion)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transferencia_usuario'
  ) THEN
    ALTER TABLE public.transferencia_inventario
      ADD CONSTRAINT fk_transferencia_usuario
      FOREIGN KEY (cod_usuario)
      REFERENCES public.usuarios(cod_usuario)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transferencia_fecha
  ON public.transferencia_inventario (fecha DESC);

CREATE INDEX IF NOT EXISTS idx_transferencia_producto
  ON public.transferencia_inventario (cod_producto);

CREATE INDEX IF NOT EXISTS idx_transferencia_ref
  ON public.transferencia_inventario (referencia);

CREATE INDEX IF NOT EXISTS idx_transferencia_origen_destino
  ON public.transferencia_inventario (cod_ubicacion_origen, cod_ubicacion_destino);

CREATE INDEX IF NOT EXISTS idx_transferencia_estado
  ON public.transferencia_inventario (estado);

COMMIT;

