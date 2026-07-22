BEGIN;

LOCK TABLE public.pago IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  pagos_registros bigint := 0;
BEGIN
  IF to_regclass('public.pagos') IS NOT NULL THEN
    EXECUTE 'LOCK TABLE public.pagos IN ACCESS EXCLUSIVE MODE';
    EXECUTE 'SELECT COUNT(*) FROM public.pagos' INTO pagos_registros;

    IF pagos_registros > 0 THEN
      RAISE EXCEPTION 'public.pagos contiene registros (%). No se puede consolidar automaticamente.', pagos_registros;
    END IF;
  END IF;
END
$$;

ALTER TABLE public.pago
  ALTER COLUMN estado SET DEFAULT true,
  ALTER COLUMN estado SET NOT NULL;

DO $$
DECLARE
  registro record;
BEGIN
  FOR registro IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'pago'
      AND con.contype = 'f'
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS colnum
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = colnum
        WHERE att.attname IN ('cod_factura', 'cod_usuario', 'metodo_pago')
      )
  LOOP
    EXECUTE format('ALTER TABLE public.pago DROP CONSTRAINT IF EXISTS %I', registro.conname);
  END LOOP;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.pago p
    LEFT JOIN public.factura f ON f.cod_factura = p.cod_factura
    WHERE p.cod_factura IS NOT NULL AND f.cod_factura IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen pagos huérfanos por factura inexistente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pago p
    LEFT JOIN public.usuarios u ON u.cod_usuario = p.cod_usuario
    WHERE p.cod_usuario IS NOT NULL AND u.cod_usuario IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen pagos huérfanos por usuario inexistente';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pago p
    LEFT JOIN public.cat_metodo_pago m ON m.cod_cat_metodo_pago = p.metodo_pago
    WHERE p.metodo_pago IS NOT NULL AND m.cod_cat_metodo_pago IS NULL
  ) THEN
    RAISE EXCEPTION 'Existen pagos huérfanos por método de pago inexistente';
  END IF;
END
$$;

ALTER TABLE public.pago
  ADD CONSTRAINT fk_pago_factura
    FOREIGN KEY (cod_factura)
    REFERENCES public.factura (cod_factura)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  ADD CONSTRAINT fk_pago_usuario
    FOREIGN KEY (cod_usuario)
    REFERENCES public.usuarios (cod_usuario)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  ADD CONSTRAINT fk_pago_metodo
    FOREIGN KEY (metodo_pago)
    REFERENCES public.cat_metodo_pago (cod_cat_metodo_pago)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_pago_cod_factura ON public.pago (cod_factura);
CREATE INDEX IF NOT EXISTS idx_pago_cod_usuario ON public.pago (cod_usuario);
CREATE INDEX IF NOT EXISTS idx_pago_metodo_pago ON public.pago (metodo_pago);

DO $$
DECLARE
  pagos_registros bigint := 0;
BEGIN
  IF to_regclass('public.pagos') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*) FROM public.pagos' INTO pagos_registros;
    IF pagos_registros = 0 THEN
      EXECUTE 'DROP TABLE public.pagos';
    END IF;
  END IF;
END
$$;

COMMIT;

ANALYZE public.pago;

SELECT to_regclass('public.pago') AS pago_existe;
SELECT to_regclass('public.pagos') AS pagos_existe;
SELECT COUNT(*) AS llaves_foraneas
FROM pg_constraint
WHERE conrelid = 'public.pago'::regclass AND contype = 'f';
SELECT conname AS restricciones
FROM pg_constraint
WHERE conrelid = 'public.pago'::regclass
ORDER BY conname;