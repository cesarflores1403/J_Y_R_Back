--
-- PostgreSQL database dump
--

\restrict L3SarSahY1wYCpPwD4hYLxKl1jPauf8MK8CMBrhnRZyoBaLN4XSQDHy4122LwoT

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.producto DROP CONSTRAINT IF EXISTS producto_cod_ubicacion_fkey;
ALTER TABLE IF EXISTS ONLY public.pago DROP CONSTRAINT IF EXISTS pago_cod_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.pago DROP CONSTRAINT IF EXISTS pago_cod_factura_fkey;
ALTER TABLE IF EXISTS ONLY public.nota_credito DROP CONSTRAINT IF EXISTS nota_credito_cod_factura_fkey;
ALTER TABLE IF EXISTS ONLY public.usuarios_rol DROP CONSTRAINT IF EXISTS fk_ur_usuario;
ALTER TABLE IF EXISTS ONLY public.usuarios_rol DROP CONSTRAINT IF EXISTS fk_ur_rol;
ALTER TABLE IF EXISTS ONLY public.ubicacion DROP CONSTRAINT IF EXISTS fk_ubicacion_cod_producto;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_usuario_anulacion;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_usuario;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_ubicacion_origen;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_ubicacion_destino;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_producto;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_inv_origen;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS fk_transferencia_inv_destino;
ALTER TABLE IF EXISTS ONLY public.roles_permisos DROP CONSTRAINT IF EXISTS fk_rp_rol;
ALTER TABLE IF EXISTS ONLY public.roles_permisos DROP CONSTRAINT IF EXISTS fk_rp_permiso;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_usuario_libera;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_usuario_crea;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_usuario_consume;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_ubicacion;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_producto;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS fk_reserva_inv_inventario;
ALTER TABLE IF EXISTS ONLY public.recepcion DROP CONSTRAINT IF EXISTS fk_rec_usr;
ALTER TABLE IF EXISTS ONLY public.recepcion DROP CONSTRAINT IF EXISTS fk_rec_oc;
ALTER TABLE IF EXISTS ONLY public.producto DROP CONSTRAINT IF EXISTS fk_producto_isv;
ALTER TABLE IF EXISTS ONLY public.producto DROP CONSTRAINT IF EXISTS fk_prod_categoria;
ALTER TABLE IF EXISTS ONLY public.producto_proveedor DROP CONSTRAINT IF EXISTS fk_pp_prov;
ALTER TABLE IF EXISTS ONLY public.producto_proveedor DROP CONSTRAINT IF EXISTS fk_pp_prod;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS fk_pag_metodo;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS fk_pag_factura;
ALTER TABLE IF EXISTS ONLY public.orden_reparacion DROP CONSTRAINT IF EXISTS fk_or_estado;
ALTER TABLE IF EXISTS ONLY public.orden_reparacion DROP CONSTRAINT IF EXISTS fk_or_equipo;
ALTER TABLE IF EXISTS ONLY public.orden_reparacion DROP CONSTRAINT IF EXISTS fk_or_cliente;
ALTER TABLE IF EXISTS ONLY public.orden_compra DROP CONSTRAINT IF EXISTS fk_oc_usr;
ALTER TABLE IF EXISTS ONLY public.orden_compra DROP CONSTRAINT IF EXISTS fk_oc_prov;
ALTER TABLE IF EXISTS ONLY public.orden_compra DROP CONSTRAINT IF EXISTS fk_oc_estado;
ALTER TABLE IF EXISTS ONLY public.movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv_usuario;
ALTER TABLE IF EXISTS ONLY public.movimiento_inventario DROP CONSTRAINT IF EXISTS fk_mov_inv;
ALTER TABLE IF EXISTS ONLY public.inventario DROP CONSTRAINT IF EXISTS fk_inv_ubi;
ALTER TABLE IF EXISTS ONLY public.inventario DROP CONSTRAINT IF EXISTS fk_inv_prod;
ALTER TABLE IF EXISTS ONLY public.grupo_cliente DROP CONSTRAINT IF EXISTS fk_gc_cliente;
ALTER TABLE IF EXISTS ONLY public.factura DROP CONSTRAINT IF EXISTS fk_fac_usr;
ALTER TABLE IF EXISTS ONLY public.factura DROP CONSTRAINT IF EXISTS fk_fac_metodo;
ALTER TABLE IF EXISTS ONLY public.factura DROP CONSTRAINT IF EXISTS fk_fac_cliente;
ALTER TABLE IF EXISTS ONLY public.estado_reparacion DROP CONSTRAINT IF EXISTS fk_er_orden;
ALTER TABLE IF EXISTS ONLY public.estado_reparacion DROP CONSTRAINT IF EXISTS fk_er_cat;
ALTER TABLE IF EXISTS ONLY public.estado_orden_compra DROP CONSTRAINT IF EXISTS fk_eoc_oc;
ALTER TABLE IF EXISTS ONLY public.estado_orden_compra DROP CONSTRAINT IF EXISTS fk_eoc_estado;
ALTER TABLE IF EXISTS ONLY public.entrega DROP CONSTRAINT IF EXISTS fk_ent_rep;
ALTER TABLE IF EXISTS ONLY public.entrega DROP CONSTRAINT IF EXISTS fk_ent_factura;
ALTER TABLE IF EXISTS ONLY public.entrega DROP CONSTRAINT IF EXISTS fk_ent_estado;
ALTER TABLE IF EXISTS ONLY public.equipo_cliente DROP CONSTRAINT IF EXISTS fk_ec_cliente;
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS fk_drec_rec;
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS fk_drec_prod;
ALTER TABLE IF EXISTS ONLY public.devoluciones_proveedor DROP CONSTRAINT IF EXISTS fk_dp_rec;
ALTER TABLE IF EXISTS ONLY public.devoluciones_proveedor DROP CONSTRAINT IF EXISTS fk_dp_prov;
ALTER TABLE IF EXISTS ONLY public.devoluciones_proveedor DROP CONSTRAINT IF EXISTS fk_dp_estado;
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS fk_doc_prod;
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS fk_doc_oc;
ALTER TABLE IF EXISTS ONLY public.detalle_factura DROP CONSTRAINT IF EXISTS fk_df_serv;
ALTER TABLE IF EXISTS ONLY public.detalle_factura DROP CONSTRAINT IF EXISTS fk_df_prod;
ALTER TABLE IF EXISTS ONLY public.detalle_factura DROP CONSTRAINT IF EXISTS fk_df_factura;
ALTER TABLE IF EXISTS ONLY public.detalles_devoluciones_proveedor DROP CONSTRAINT IF EXISTS fk_ddp_prod;
ALTER TABLE IF EXISTS ONLY public.detalles_devoluciones_proveedor DROP CONSTRAINT IF EXISTS fk_ddp_dev;
ALTER TABLE IF EXISTS ONLY public.detalle_dev_cliente DROP CONSTRAINT IF EXISTS fk_ddc_df;
ALTER TABLE IF EXISTS ONLY public.detalle_dev_cliente DROP CONSTRAINT IF EXISTS fk_ddc_dev;
ALTER TABLE IF EXISTS ONLY public.detalles_control_calidad DROP CONSTRAINT IF EXISTS fk_dcc_prod;
ALTER TABLE IF EXISTS ONLY public.detalles_control_calidad DROP CONSTRAINT IF EXISTS fk_dcc_cc;
ALTER TABLE IF EXISTS ONLY public.dev_cliente DROP CONSTRAINT IF EXISTS fk_dc_fact;
ALTER TABLE IF EXISTS ONLY public.dev_cliente DROP CONSTRAINT IF EXISTS fk_dc_estado;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario DROP CONSTRAINT IF EXISTS fk_conteo_usuario_cierre;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario DROP CONSTRAINT IF EXISTS fk_conteo_usuario_apertura;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS fk_conteo_det_ubicacion;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS fk_conteo_det_producto;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS fk_conteo_det_inventario;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS fk_conteo_det_conteo;
ALTER TABLE IF EXISTS ONLY public.control_calidad DROP CONSTRAINT IF EXISTS fk_cc_usr;
ALTER TABLE IF EXISTS ONLY public.control_calidad DROP CONSTRAINT IF EXISTS fk_cc_rec;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_usr;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_ubi;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_prod;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_usuario_anulacion;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_usuario;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_ubicacion;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_producto;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_mov_baja;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS fk_baja_inventario_mov_anulacion;
ALTER TABLE IF EXISTS ONLY public.factura DROP CONSTRAINT IF EXISTS factura_anulada_por_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_nota_credito DROP CONSTRAINT IF EXISTS detalle_nota_credito_cod_nota_credito_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_nota_credito DROP CONSTRAINT IF EXISTS detalle_nota_credito_cod_detalle_factura_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_cod_producto_fkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_cod_cotizacion_fkey;
ALTER TABLE IF EXISTS ONLY public.cotizacion DROP CONSTRAINT IF EXISTS cotizacion_cod_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.cotizacion DROP CONSTRAINT IF EXISTS cotizacion_cod_factura_fkey;
ALTER TABLE IF EXISTS ONLY public.cotizacion DROP CONSTRAINT IF EXISTS cotizacion_cod_cliente_fkey;
ALTER TABLE IF EXISTS ONLY public.bitacora_anulacion DROP CONSTRAINT IF EXISTS bitacora_anulacion_cod_usuario_fkey;
ALTER TABLE IF EXISTS ONLY public.bitacora_anulacion DROP CONSTRAINT IF EXISTS bitacora_anulacion_cod_factura_fkey;
DROP INDEX IF EXISTS public.uq_servicios_nombre;
DROP INDEX IF EXISTS public.uq_producto_nombre;
DROP INDEX IF EXISTS public.uq_categoria_nombre;
DROP INDEX IF EXISTS public.uq_cat_metodo_pago_nombre;
DROP INDEX IF EXISTS public.uq_cat_estado_rep_nombre;
DROP INDEX IF EXISTS public.uq_cat_estado_oc_nombre;
DROP INDEX IF EXISTS public.uq_cat_estado_entrega_nombre;
DROP INDEX IF EXISTS public.uq_cat_estado_dev_nombre;
DROP INDEX IF EXISTS public.idx_usuarios_estado;
DROP INDEX IF EXISTS public.idx_ur_rol;
DROP INDEX IF EXISTS public.idx_ubicacion_codigo_producto;
DROP INDEX IF EXISTS public.idx_ubicacion_cod_producto;
DROP INDEX IF EXISTS public.idx_transferencia_usuario_anulacion;
DROP INDEX IF EXISTS public.idx_transferencia_ref;
DROP INDEX IF EXISTS public.idx_transferencia_producto;
DROP INDEX IF EXISTS public.idx_transferencia_origen_destino;
DROP INDEX IF EXISTS public.idx_transferencia_fecha_anulacion;
DROP INDEX IF EXISTS public.idx_transferencia_fecha;
DROP INDEX IF EXISTS public.idx_transferencia_estado_fecha;
DROP INDEX IF EXISTS public.idx_transferencia_estado;
DROP INDEX IF EXISTS public.idx_rp_rol;
DROP INDEX IF EXISTS public.idx_rp_permiso;
DROP INDEX IF EXISTS public.idx_reserva_usuario_creacion;
DROP INDEX IF EXISTS public.idx_reserva_referencia;
DROP INDEX IF EXISTS public.idx_reserva_producto_ubicacion;
DROP INDEX IF EXISTS public.idx_reserva_inventario;
DROP INDEX IF EXISTS public.idx_reserva_estado_fecha;
DROP INDEX IF EXISTS public.idx_reserva_activa_inventario;
DROP INDEX IF EXISTS public.idx_rec_usr;
DROP INDEX IF EXISTS public.idx_rec_oc;
DROP INDEX IF EXISTS public.idx_proveedor_estado;
DROP INDEX IF EXISTS public.idx_producto_cod_categoria;
DROP INDEX IF EXISTS public.idx_pp_prov;
DROP INDEX IF EXISTS public.idx_pp_prod;
DROP INDEX IF EXISTS public.idx_pagos_metodo_pago;
DROP INDEX IF EXISTS public.idx_pagos_cod_factura;
DROP INDEX IF EXISTS public.idx_pago_cod_factura;
DROP INDEX IF EXISTS public.idx_or_estado;
DROP INDEX IF EXISTS public.idx_or_equipo;
DROP INDEX IF EXISTS public.idx_or_cliente;
DROP INDEX IF EXISTS public.idx_oc_usr;
DROP INDEX IF EXISTS public.idx_oc_prov;
DROP INDEX IF EXISTS public.idx_oc_estado;
DROP INDEX IF EXISTS public.idx_nc_usuario;
DROP INDEX IF EXISTS public.idx_nc_fecha;
DROP INDEX IF EXISTS public.idx_nc_factura;
DROP INDEX IF EXISTS public.idx_nc_estado;
DROP INDEX IF EXISTS public.idx_mov_inv_tipo_fecha;
DROP INDEX IF EXISTS public.idx_mov_inv_referencia_documento;
DROP INDEX IF EXISTS public.idx_mov_inv_ref_tipo_ref_id;
DROP INDEX IF EXISTS public.idx_mov_inv_cod_usuario;
DROP INDEX IF EXISTS public.idx_mov_inv_cod_inventario;
DROP INDEX IF EXISTS public.idx_inventario_fecha_ult_mov;
DROP INDEX IF EXISTS public.idx_inventario_cod_ubicacion;
DROP INDEX IF EXISTS public.idx_inventario_cod_producto;
DROP INDEX IF EXISTS public.idx_gc_cliente;
DROP INDEX IF EXISTS public.idx_factura_metodo_pago;
DROP INDEX IF EXISTS public.idx_factura_cod_usuario;
DROP INDEX IF EXISTS public.idx_factura_cod_cliente;
DROP INDEX IF EXISTS public.idx_er_orden;
DROP INDEX IF EXISTS public.idx_eoc_oc;
DROP INDEX IF EXISTS public.idx_eoc_estado;
DROP INDEX IF EXISTS public.idx_entrega_repartidor;
DROP INDEX IF EXISTS public.idx_entrega_estado;
DROP INDEX IF EXISTS public.idx_entrega_cod_factura;
DROP INDEX IF EXISTS public.idx_ec_cliente;
DROP INDEX IF EXISTS public.idx_drec_rec;
DROP INDEX IF EXISTS public.idx_drec_prod;
DROP INDEX IF EXISTS public.idx_dp_rec;
DROP INDEX IF EXISTS public.idx_dp_prov;
DROP INDEX IF EXISTS public.idx_dp_estado;
DROP INDEX IF EXISTS public.idx_doc_prod;
DROP INDEX IF EXISTS public.idx_doc_oc;
DROP INDEX IF EXISTS public.idx_dnc_prod;
DROP INDEX IF EXISTS public.idx_dnc_nota;
DROP INDEX IF EXISTS public.idx_dnc_detfac;
DROP INDEX IF EXISTS public.idx_dev_cliente_factura;
DROP INDEX IF EXISTS public.idx_dev_cliente_estado;
DROP INDEX IF EXISTS public.idx_detalle_factura_cod_servicio;
DROP INDEX IF EXISTS public.idx_detalle_factura_cod_producto;
DROP INDEX IF EXISTS public.idx_detalle_factura_cod_factura;
DROP INDEX IF EXISTS public.idx_detalle_dev_cliente_df;
DROP INDEX IF EXISTS public.idx_detalle_dev_cliente_dev;
DROP INDEX IF EXISTS public.idx_det_cotizacion_cot;
DROP INDEX IF EXISTS public.idx_ddp_prod;
DROP INDEX IF EXISTS public.idx_ddp_dev;
DROP INDEX IF EXISTS public.idx_dcc_prod;
DROP INDEX IF EXISTS public.idx_dcc_cc;
DROP INDEX IF EXISTS public.idx_cotizacion_estado;
DROP INDEX IF EXISTS public.idx_cotizacion_cliente;
DROP INDEX IF EXISTS public.idx_conteo_usuario_cierre;
DROP INDEX IF EXISTS public.idx_conteo_usuario_apertura;
DROP INDEX IF EXISTS public.idx_conteo_fecha_cierre;
DROP INDEX IF EXISTS public.idx_conteo_estado_fecha;
DROP INDEX IF EXISTS public.idx_conteo_det_producto_ubicacion;
DROP INDEX IF EXISTS public.idx_conteo_det_inventario;
DROP INDEX IF EXISTS public.idx_conteo_det_conteo_fecha;
DROP INDEX IF EXISTS public.idx_conteo_det_conteo;
DROP INDEX IF EXISTS public.idx_clientes_dni;
DROP INDEX IF EXISTS public.idx_cc_rec;
DROP INDEX IF EXISTS public.idx_bitfac_usuario;
DROP INDEX IF EXISTS public.idx_bitfac_fecha;
DROP INDEX IF EXISTS public.idx_bitfac_factura;
DROP INDEX IF EXISTS public.idx_bitfac_evento;
DROP INDEX IF EXISTS public.idx_bitfac_entidad;
DROP INDEX IF EXISTS public.idx_bitexc_usuario;
DROP INDEX IF EXISTS public.idx_bitexc_producto;
DROP INDEX IF EXISTS public.idx_bitexc_factura;
DROP INDEX IF EXISTS public.idx_baja_usuario;
DROP INDEX IF EXISTS public.idx_baja_producto;
DROP INDEX IF EXISTS public.idx_baja_inventario_producto_ubicacion;
DROP INDEX IF EXISTS public.idx_baja_inventario_mov_baja_unq;
DROP INDEX IF EXISTS public.idx_baja_inventario_fecha;
DROP INDEX IF EXISTS public.idx_baja_inventario_estado_fecha;
ALTER TABLE IF EXISTS ONLY public.usuarios_rol DROP CONSTRAINT IF EXISTS usuarios_rol_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE IF EXISTS ONLY public.usuarios DROP CONSTRAINT IF EXISTS usuarios_nombre_usuario_key;
ALTER TABLE IF EXISTS ONLY public.roles_permisos DROP CONSTRAINT IF EXISTS uq_rol_perm;
ALTER TABLE IF EXISTS ONLY public.producto_proveedor DROP CONSTRAINT IF EXISTS uq_prod_prov;
ALTER TABLE IF EXISTS ONLY public.inventario DROP CONSTRAINT IF EXISTS uq_inv_prod_ubi;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS uq_conteo_detalle;
ALTER TABLE IF EXISTS ONLY public.ubicacion DROP CONSTRAINT IF EXISTS ubicacion_pkey;
ALTER TABLE IF EXISTS ONLY public.transferencia_inventario DROP CONSTRAINT IF EXISTS transferencia_inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.servicios DROP CONSTRAINT IF EXISTS servicios_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE IF EXISTS ONLY public.roles_permisos DROP CONSTRAINT IF EXISTS roles_permisos_pkey;
ALTER TABLE IF EXISTS ONLY public.roles DROP CONSTRAINT IF EXISTS roles_nombre_rol_key;
ALTER TABLE IF EXISTS ONLY public.reserva_inventario DROP CONSTRAINT IF EXISTS reserva_inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.recepcion DROP CONSTRAINT IF EXISTS recepcion_pkey;
ALTER TABLE IF EXISTS ONLY public.proveedor DROP CONSTRAINT IF EXISTS proveedor_pkey;
ALTER TABLE IF EXISTS ONLY public.producto_proveedor DROP CONSTRAINT IF EXISTS producto_proveedor_pkey;
ALTER TABLE IF EXISTS ONLY public.producto DROP CONSTRAINT IF EXISTS producto_pkey;
ALTER TABLE IF EXISTS ONLY public.personas DROP CONSTRAINT IF EXISTS personas_pkey;
ALTER TABLE IF EXISTS ONLY public.personas DROP CONSTRAINT IF EXISTS personas_correo_key;
ALTER TABLE IF EXISTS ONLY public.permisos DROP CONSTRAINT IF EXISTS permisos_pkey;
ALTER TABLE IF EXISTS ONLY public.permisos DROP CONSTRAINT IF EXISTS permisos_nombre_permiso_key;
ALTER TABLE IF EXISTS ONLY public.pagos DROP CONSTRAINT IF EXISTS pagos_pkey;
ALTER TABLE IF EXISTS ONLY public.pago DROP CONSTRAINT IF EXISTS pago_pkey;
ALTER TABLE IF EXISTS ONLY public.orden_reparacion DROP CONSTRAINT IF EXISTS orden_reparacion_pkey;
ALTER TABLE IF EXISTS ONLY public.orden_compra DROP CONSTRAINT IF EXISTS orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones_super_admin DROP CONSTRAINT IF EXISTS notificaciones_super_admin_pkey;
ALTER TABLE IF EXISTS ONLY public.notificaciones_super_admin_leidas DROP CONSTRAINT IF EXISTS notificaciones_super_admin_leidas_pkey;
ALTER TABLE IF EXISTS ONLY public.nota_credito DROP CONSTRAINT IF EXISTS nota_credito_pkey;
ALTER TABLE IF EXISTS ONLY public.movimiento_inventario DROP CONSTRAINT IF EXISTS movimiento_inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.inventario DROP CONSTRAINT IF EXISTS inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.grupo_cliente DROP CONSTRAINT IF EXISTS grupo_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.factura DROP CONSTRAINT IF EXISTS factura_pkey;
ALTER TABLE IF EXISTS ONLY public.estado_reparacion DROP CONSTRAINT IF EXISTS estado_reparacion_pkey;
ALTER TABLE IF EXISTS ONLY public.estado_orden_compra DROP CONSTRAINT IF EXISTS estado_orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.equipo_cliente DROP CONSTRAINT IF EXISTS equipo_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.entrega DROP CONSTRAINT IF EXISTS entrega_pkey;
ALTER TABLE IF EXISTS ONLY public.empresa_config DROP CONSTRAINT IF EXISTS empresa_config_pkey;
ALTER TABLE IF EXISTS ONLY public.devoluciones_proveedor DROP CONSTRAINT IF EXISTS devoluciones_proveedor_pkey;
ALTER TABLE IF EXISTS ONLY public.dev_cliente DROP CONSTRAINT IF EXISTS dev_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_recepcion DROP CONSTRAINT IF EXISTS detalles_recepcion_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_orden_compra DROP CONSTRAINT IF EXISTS detalles_orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_devoluciones_proveedor DROP CONSTRAINT IF EXISTS detalles_devoluciones_proveedor_pkey;
ALTER TABLE IF EXISTS ONLY public.detalles_control_calidad DROP CONSTRAINT IF EXISTS detalles_control_calidad_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_nota_credito DROP CONSTRAINT IF EXISTS detalle_nota_credito_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_factura DROP CONSTRAINT IF EXISTS detalle_factura_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_dev_cliente DROP CONSTRAINT IF EXISTS detalle_dev_cliente_pkey;
ALTER TABLE IF EXISTS ONLY public.detalle_cotizacion DROP CONSTRAINT IF EXISTS detalle_cotizacion_pkey;
ALTER TABLE IF EXISTS ONLY public.cotizacion DROP CONSTRAINT IF EXISTS cotizacion_pkey;
ALTER TABLE IF EXISTS ONLY public.control_calidad DROP CONSTRAINT IF EXISTS control_calidad_pkey;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario DROP CONSTRAINT IF EXISTS conteo_inventario_pkey;
ALTER TABLE IF EXISTS ONLY public.conteo_inventario_detalle DROP CONSTRAINT IF EXISTS conteo_inventario_detalle_pkey;
ALTER TABLE IF EXISTS ONLY public.clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE IF EXISTS ONLY public.categoria_producto DROP CONSTRAINT IF EXISTS categoria_producto_pkey;
ALTER TABLE IF EXISTS ONLY public.catalogo_isv DROP CONSTRAINT IF EXISTS catalogo_isv_pkey;
ALTER TABLE IF EXISTS ONLY public.cat_metodo_pago DROP CONSTRAINT IF EXISTS cat_metodo_pago_pkey;
ALTER TABLE IF EXISTS ONLY public.cat_estado_reparacion DROP CONSTRAINT IF EXISTS cat_estado_reparacion_pkey;
ALTER TABLE IF EXISTS ONLY public.cat_estado_orden_compra DROP CONSTRAINT IF EXISTS cat_estado_orden_compra_pkey;
ALTER TABLE IF EXISTS ONLY public.cat_estado_entrega DROP CONSTRAINT IF EXISTS cat_estado_entrega_pkey;
ALTER TABLE IF EXISTS ONLY public.cat_estado_dev DROP CONSTRAINT IF EXISTS cat_estado_dev_pkey;
ALTER TABLE IF EXISTS ONLY public.carrusel_imagenes DROP CONSTRAINT IF EXISTS carrusel_imagenes_pkey;
ALTER TABLE IF EXISTS ONLY public.bitacora_facturacion DROP CONSTRAINT IF EXISTS bitacora_facturacion_pkey;
ALTER TABLE IF EXISTS ONLY public.bitacora_excepcion_stock DROP CONSTRAINT IF EXISTS bitacora_excepcion_stock_pkey;
ALTER TABLE IF EXISTS ONLY public.bitacora_anulacion DROP CONSTRAINT IF EXISTS bitacora_anulacion_pkey;
ALTER TABLE IF EXISTS ONLY public.baja_inventario DROP CONSTRAINT IF EXISTS baja_inventario_pkey;
ALTER TABLE IF EXISTS public.usuarios ALTER COLUMN cod_usuario DROP DEFAULT;
ALTER TABLE IF EXISTS public.ubicacion ALTER COLUMN cod_ubicacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.transferencia_inventario ALTER COLUMN cod_transferencia_inventario DROP DEFAULT;
ALTER TABLE IF EXISTS public.servicios ALTER COLUMN cod_servicio DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles_permisos ALTER COLUMN cod_rol_permiso DROP DEFAULT;
ALTER TABLE IF EXISTS public.roles ALTER COLUMN cod_rol DROP DEFAULT;
ALTER TABLE IF EXISTS public.reserva_inventario ALTER COLUMN cod_reserva_inventario DROP DEFAULT;
ALTER TABLE IF EXISTS public.recepcion ALTER COLUMN cod_recepcion DROP DEFAULT;
ALTER TABLE IF EXISTS public.proveedor ALTER COLUMN cod_proveedor DROP DEFAULT;
ALTER TABLE IF EXISTS public.producto_proveedor ALTER COLUMN cod_producto_proveedor DROP DEFAULT;
ALTER TABLE IF EXISTS public.producto ALTER COLUMN cod_producto DROP DEFAULT;
ALTER TABLE IF EXISTS public.personas ALTER COLUMN id_persona DROP DEFAULT;
ALTER TABLE IF EXISTS public.permisos ALTER COLUMN cod_permiso DROP DEFAULT;
ALTER TABLE IF EXISTS public.pagos ALTER COLUMN cod_pagos DROP DEFAULT;
ALTER TABLE IF EXISTS public.pago ALTER COLUMN cod_pago DROP DEFAULT;
ALTER TABLE IF EXISTS public.orden_reparacion ALTER COLUMN cod_orden_reparacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.orden_compra ALTER COLUMN cod_orden_compra DROP DEFAULT;
ALTER TABLE IF EXISTS public.notificaciones_super_admin ALTER COLUMN cod_notificacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.nota_credito ALTER COLUMN cod_nota_credito DROP DEFAULT;
ALTER TABLE IF EXISTS public.movimiento_inventario ALTER COLUMN cod_mov_inv DROP DEFAULT;
ALTER TABLE IF EXISTS public.inventario ALTER COLUMN cod_inventario DROP DEFAULT;
ALTER TABLE IF EXISTS public.grupo_cliente ALTER COLUMN cod_grupo DROP DEFAULT;
ALTER TABLE IF EXISTS public.factura ALTER COLUMN cod_factura DROP DEFAULT;
ALTER TABLE IF EXISTS public.estado_reparacion ALTER COLUMN cod_estado_reparacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.estado_orden_compra ALTER COLUMN cod_est_orden_compra DROP DEFAULT;
ALTER TABLE IF EXISTS public.equipo_cliente ALTER COLUMN cod_equipo DROP DEFAULT;
ALTER TABLE IF EXISTS public.entrega ALTER COLUMN cod_entrega DROP DEFAULT;
ALTER TABLE IF EXISTS public.empresa_config ALTER COLUMN cod_config DROP DEFAULT;
ALTER TABLE IF EXISTS public.devoluciones_proveedor ALTER COLUMN cod_devo_prov DROP DEFAULT;
ALTER TABLE IF EXISTS public.dev_cliente ALTER COLUMN cod_dev_cliente DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalles_recepcion ALTER COLUMN cod_detalles_recepcion DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalles_orden_compra ALTER COLUMN cod_detalle_oc DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalles_devoluciones_proveedor ALTER COLUMN cod_detalles_dev_prov DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalles_control_calidad ALTER COLUMN cod_detalle_cc DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalle_nota_credito ALTER COLUMN cod_detalle_nc DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalle_factura ALTER COLUMN cod_detalle_factura DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalle_dev_cliente ALTER COLUMN cod_detalle_dev_cliente DROP DEFAULT;
ALTER TABLE IF EXISTS public.detalle_cotizacion ALTER COLUMN cod_detalle_cotizacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.cotizacion ALTER COLUMN cod_cotizacion DROP DEFAULT;
ALTER TABLE IF EXISTS public.control_calidad ALTER COLUMN cod_control_calidad DROP DEFAULT;
ALTER TABLE IF EXISTS public.conteo_inventario_detalle ALTER COLUMN cod_conteo_detalle DROP DEFAULT;
ALTER TABLE IF EXISTS public.conteo_inventario ALTER COLUMN cod_conteo_inventario DROP DEFAULT;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN cod_cliente DROP DEFAULT;
ALTER TABLE IF EXISTS public.categoria_producto ALTER COLUMN cod_categoria DROP DEFAULT;
ALTER TABLE IF EXISTS public.catalogo_isv ALTER COLUMN cod_isv DROP DEFAULT;
ALTER TABLE IF EXISTS public.cat_metodo_pago ALTER COLUMN cod_cat_metodo_pago DROP DEFAULT;
ALTER TABLE IF EXISTS public.cat_estado_reparacion ALTER COLUMN cod_cat_est_rep DROP DEFAULT;
ALTER TABLE IF EXISTS public.cat_estado_orden_compra ALTER COLUMN cod_estado_oc DROP DEFAULT;
ALTER TABLE IF EXISTS public.cat_estado_entrega ALTER COLUMN cod_cat_est_entrega DROP DEFAULT;
ALTER TABLE IF EXISTS public.cat_estado_dev ALTER COLUMN cod_cat_estado_dev DROP DEFAULT;
ALTER TABLE IF EXISTS public.carrusel_imagenes ALTER COLUMN cod_imagen DROP DEFAULT;
ALTER TABLE IF EXISTS public.bitacora_facturacion ALTER COLUMN cod_bitacora DROP DEFAULT;
ALTER TABLE IF EXISTS public.bitacora_excepcion_stock ALTER COLUMN cod_excepcion DROP DEFAULT;
ALTER TABLE IF EXISTS public.bitacora_anulacion ALTER COLUMN cod_bitacora DROP DEFAULT;
ALTER TABLE IF EXISTS public.baja_inventario ALTER COLUMN cod_baja_inventario DROP DEFAULT;
DROP VIEW IF EXISTS public.vw_usuario_roles_permisos;
DROP VIEW IF EXISTS public.vw_orden_compra_resumen;
DROP VIEW IF EXISTS public.vw_inventario_actual;
DROP VIEW IF EXISTS public.vw_factura_resumen;
DROP VIEW IF EXISTS public.vw_factura_detalle;
DROP TABLE IF EXISTS public.usuarios_rol;
DROP SEQUENCE IF EXISTS public.usuarios_cod_usuario_seq;
DROP TABLE IF EXISTS public.usuarios;
DROP SEQUENCE IF EXISTS public.ubicacion_cod_ubicacion_seq;
DROP TABLE IF EXISTS public.ubicacion;
DROP SEQUENCE IF EXISTS public.transferencia_inventario_cod_transferencia_inventario_seq;
DROP TABLE IF EXISTS public.transferencia_inventario;
DROP SEQUENCE IF EXISTS public.servicios_cod_servicio_seq;
DROP TABLE IF EXISTS public.servicios;
DROP SEQUENCE IF EXISTS public.roles_permisos_cod_rol_permiso_seq;
DROP TABLE IF EXISTS public.roles_permisos;
DROP SEQUENCE IF EXISTS public.roles_cod_rol_seq;
DROP TABLE IF EXISTS public.roles;
DROP SEQUENCE IF EXISTS public.reserva_inventario_cod_reserva_inventario_seq;
DROP TABLE IF EXISTS public.reserva_inventario;
DROP SEQUENCE IF EXISTS public.recepcion_cod_recepcion_seq;
DROP TABLE IF EXISTS public.recepcion;
DROP SEQUENCE IF EXISTS public.proveedor_cod_proveedor_seq;
DROP TABLE IF EXISTS public.proveedor;
DROP SEQUENCE IF EXISTS public.producto_proveedor_cod_producto_proveedor_seq;
DROP TABLE IF EXISTS public.producto_proveedor;
DROP SEQUENCE IF EXISTS public.producto_cod_producto_seq;
DROP TABLE IF EXISTS public.producto;
DROP SEQUENCE IF EXISTS public.personas_id_persona_seq;
DROP TABLE IF EXISTS public.personas;
DROP SEQUENCE IF EXISTS public.permisos_cod_permiso_seq;
DROP TABLE IF EXISTS public.permisos;
DROP SEQUENCE IF EXISTS public.pagos_cod_pagos_seq;
DROP TABLE IF EXISTS public.pagos;
DROP SEQUENCE IF EXISTS public.pago_cod_pago_seq;
DROP TABLE IF EXISTS public.pago;
DROP SEQUENCE IF EXISTS public.orden_reparacion_cod_orden_reparacion_seq;
DROP TABLE IF EXISTS public.orden_reparacion;
DROP SEQUENCE IF EXISTS public.orden_compra_cod_orden_compra_seq;
DROP TABLE IF EXISTS public.orden_compra;
DROP TABLE IF EXISTS public.notificaciones_super_admin_leidas;
DROP SEQUENCE IF EXISTS public.notificaciones_super_admin_cod_notificacion_seq;
DROP TABLE IF EXISTS public.notificaciones_super_admin;
DROP SEQUENCE IF EXISTS public.nota_credito_cod_nota_credito_seq;
DROP TABLE IF EXISTS public.nota_credito;
DROP SEQUENCE IF EXISTS public.movimiento_inventario_cod_mov_inv_seq;
DROP TABLE IF EXISTS public.movimiento_inventario;
DROP SEQUENCE IF EXISTS public.inventario_cod_inventario_seq;
DROP TABLE IF EXISTS public.inventario;
DROP SEQUENCE IF EXISTS public.grupo_cliente_cod_grupo_seq;
DROP TABLE IF EXISTS public.grupo_cliente;
DROP SEQUENCE IF EXISTS public.factura_cod_factura_seq;
DROP TABLE IF EXISTS public.factura;
DROP SEQUENCE IF EXISTS public.estado_reparacion_cod_estado_reparacion_seq;
DROP TABLE IF EXISTS public.estado_reparacion;
DROP SEQUENCE IF EXISTS public.estado_orden_compra_cod_est_orden_compra_seq;
DROP TABLE IF EXISTS public.estado_orden_compra;
DROP SEQUENCE IF EXISTS public.equipo_cliente_cod_equipo_seq;
DROP TABLE IF EXISTS public.equipo_cliente;
DROP SEQUENCE IF EXISTS public.entrega_cod_entrega_seq;
DROP TABLE IF EXISTS public.entrega;
DROP SEQUENCE IF EXISTS public.empresa_config_cod_config_seq;
DROP TABLE IF EXISTS public.empresa_config;
DROP SEQUENCE IF EXISTS public.devoluciones_proveedor_cod_devo_prov_seq;
DROP TABLE IF EXISTS public.devoluciones_proveedor;
DROP SEQUENCE IF EXISTS public.dev_cliente_cod_dev_cliente_seq;
DROP TABLE IF EXISTS public.dev_cliente;
DROP SEQUENCE IF EXISTS public.detalles_recepcion_cod_detalles_recepcion_seq;
DROP TABLE IF EXISTS public.detalles_recepcion;
DROP SEQUENCE IF EXISTS public.detalles_orden_compra_cod_detalle_oc_seq;
DROP TABLE IF EXISTS public.detalles_orden_compra;
DROP SEQUENCE IF EXISTS public.detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq;
DROP TABLE IF EXISTS public.detalles_devoluciones_proveedor;
DROP SEQUENCE IF EXISTS public.detalles_control_calidad_cod_detalle_cc_seq;
DROP TABLE IF EXISTS public.detalles_control_calidad;
DROP SEQUENCE IF EXISTS public.detalle_nota_credito_cod_detalle_nc_seq;
DROP TABLE IF EXISTS public.detalle_nota_credito;
DROP SEQUENCE IF EXISTS public.detalle_factura_cod_detalle_factura_seq;
DROP TABLE IF EXISTS public.detalle_factura;
DROP SEQUENCE IF EXISTS public.detalle_dev_cliente_cod_detalle_dev_cliente_seq;
DROP TABLE IF EXISTS public.detalle_dev_cliente;
DROP SEQUENCE IF EXISTS public.detalle_cotizacion_cod_detalle_cotizacion_seq;
DROP TABLE IF EXISTS public.detalle_cotizacion;
DROP SEQUENCE IF EXISTS public.cotizacion_cod_cotizacion_seq;
DROP TABLE IF EXISTS public.cotizacion;
DROP SEQUENCE IF EXISTS public.control_calidad_cod_control_calidad_seq;
DROP TABLE IF EXISTS public.control_calidad;
DROP SEQUENCE IF EXISTS public.conteo_inventario_detalle_cod_conteo_detalle_seq;
DROP TABLE IF EXISTS public.conteo_inventario_detalle;
DROP SEQUENCE IF EXISTS public.conteo_inventario_cod_conteo_inventario_seq;
DROP TABLE IF EXISTS public.conteo_inventario;
DROP SEQUENCE IF EXISTS public.clientes_cod_cliente_seq;
DROP TABLE IF EXISTS public.clientes;
DROP SEQUENCE IF EXISTS public.categoria_producto_cod_categoria_seq;
DROP TABLE IF EXISTS public.categoria_producto;
DROP SEQUENCE IF EXISTS public.catalogo_isv_cod_isv_seq;
DROP TABLE IF EXISTS public.catalogo_isv;
DROP SEQUENCE IF EXISTS public.cat_metodo_pago_cod_cat_metodo_pago_seq;
DROP TABLE IF EXISTS public.cat_metodo_pago;
DROP SEQUENCE IF EXISTS public.cat_estado_reparacion_cod_cat_est_rep_seq;
DROP TABLE IF EXISTS public.cat_estado_reparacion;
DROP SEQUENCE IF EXISTS public.cat_estado_orden_compra_cod_estado_oc_seq;
DROP TABLE IF EXISTS public.cat_estado_orden_compra;
DROP SEQUENCE IF EXISTS public.cat_estado_entrega_cod_cat_est_entrega_seq;
DROP TABLE IF EXISTS public.cat_estado_entrega;
DROP SEQUENCE IF EXISTS public.cat_estado_dev_cod_cat_estado_dev_seq;
DROP TABLE IF EXISTS public.cat_estado_dev;
DROP SEQUENCE IF EXISTS public.carrusel_imagenes_cod_imagen_seq;
DROP TABLE IF EXISTS public.carrusel_imagenes;
DROP SEQUENCE IF EXISTS public.bitacora_facturacion_cod_bitacora_seq;
DROP TABLE IF EXISTS public.bitacora_facturacion;
DROP SEQUENCE IF EXISTS public.bitacora_excepcion_stock_cod_excepcion_seq;
DROP TABLE IF EXISTS public.bitacora_excepcion_stock;
DROP SEQUENCE IF EXISTS public.bitacora_anulacion_cod_bitacora_seq;
DROP TABLE IF EXISTS public.bitacora_anulacion;
DROP SEQUENCE IF EXISTS public.baja_inventario_cod_baja_inventario_seq;
DROP TABLE IF EXISTS public.baja_inventario;
DROP PROCEDURE IF EXISTS public.pa_update(IN tbl_nombre text, IN datos_json json, IN col_condicion text, IN val_condicion text);
DROP PROCEDURE IF EXISTS public.pa_insert(IN tbl_nombre text, IN datos_json json);
DROP PROCEDURE IF EXISTS public.pa_delete(IN tbl_nombre text, IN col_condicion text, IN val_condicion text);
DROP FUNCTION IF EXISTS public.function_select(p_tabla text, p_columnas text);
DROP SCHEMA IF EXISTS public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: function_select(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.function_select(p_tabla text, p_columnas text) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_query text;
  v_result json;
BEGIN
  -- Construimos un SELECT dinámico que devuelva JSON
  v_query := format(
    'SELECT COALESCE(json_agg(t), ''[]''::json) FROM (SELECT %s FROM %I) t',
    p_columnas,
    p_tabla
  );

  EXECUTE v_query INTO v_result;

  RETURN v_result;
END;
$$;


--
-- Name: pa_delete(text, text, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.pa_delete(IN tbl_nombre text, IN col_condicion text, IN val_condicion text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_query text;
BEGIN
  v_query := format(
    'DELETE FROM %I WHERE %I = %L',
    tbl_nombre,
    col_condicion,
    val_condicion
  );

  EXECUTE v_query;
END;
$$;


--
-- Name: pa_insert(text, json); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.pa_insert(IN tbl_nombre text, IN datos_json json)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_columnas text;
  v_valores  text;
  v_query    text;
BEGIN
  -- Obtener columnas desde las llaves del JSON (seguro con quote_ident)
  SELECT string_agg(quote_ident(key), ', ')
  INTO v_columnas
  FROM json_each_text(datos_json);

  -- Obtener valores desde el JSON (seguro con quote_literal)
  SELECT string_agg(quote_literal(value), ', ')
  INTO v_valores
  FROM json_each_text(datos_json);

  -- Armar INSERT dinámico seguro
  v_query := format(
    'INSERT INTO %I (%s) VALUES (%s)',
    tbl_nombre,
    v_columnas,
    v_valores
  );

  EXECUTE v_query;
END;
$$;


--
-- Name: pa_update(text, json, text, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.pa_update(IN tbl_nombre text, IN datos_json json, IN col_condicion text, IN val_condicion text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_set text;
  v_query text;
BEGIN
  -- Validar JSON no vacío
  IF datos_json IS NULL OR datos_json::text = '{}' THEN
    RAISE EXCEPTION 'datos_json no puede venir vacío';
  END IF;

  -- Construir SET dinámico seguro
  SELECT string_agg(format('%I = %L', key, value), ', ')
  INTO v_set
  FROM json_each_text(datos_json);

  -- Armar UPDATE dinámico
  v_query := format(
    'UPDATE %I SET %s WHERE %I = %L',
    tbl_nombre,
    v_set,
    col_condicion,
    val_condicion
  );

  EXECUTE v_query;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: baja_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.baja_inventario (
    cod_baja_inventario integer NOT NULL,
    cod_producto integer NOT NULL,
    cod_ubicacion integer NOT NULL,
    cod_usuario integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    cantidad integer NOT NULL,
    descripcion character varying(200),
    motivo character varying(120),
    referencia character varying(200),
    estado character varying(20) DEFAULT 'ACTIVA'::character varying,
    fecha_anulacion timestamp without time zone,
    cod_usuario_anulacion integer,
    cod_movimiento_baja integer,
    cod_movimiento_anulacion integer,
    CONSTRAINT ck_baja_cant CHECK ((cantidad > 0)),
    CONSTRAINT ck_baja_inventario_cantidad_pos CHECK ((cantidad > 0)),
    CONSTRAINT ck_baja_inventario_estado CHECK (((estado)::text = ANY (ARRAY[('ACTIVA'::character varying)::text, ('ANULADA'::character varying)::text])))
);


--
-- Name: baja_inventario_cod_baja_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.baja_inventario_cod_baja_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: baja_inventario_cod_baja_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.baja_inventario_cod_baja_inventario_seq OWNED BY public.baja_inventario.cod_baja_inventario;


--
-- Name: bitacora_anulacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_anulacion (
    cod_bitacora integer NOT NULL,
    cod_factura integer NOT NULL,
    cod_usuario integer NOT NULL,
    motivo text NOT NULL,
    fecha_anulacion timestamp without time zone DEFAULT now(),
    inventario_reversado boolean DEFAULT false,
    pagos_reversados integer DEFAULT 0,
    monto_pagos_reversados numeric(10,2) DEFAULT 0,
    detalle_json text,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);


--
-- Name: bitacora_anulacion_cod_bitacora_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_anulacion_cod_bitacora_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_anulacion_cod_bitacora_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_anulacion_cod_bitacora_seq OWNED BY public.bitacora_anulacion.cod_bitacora;


--
-- Name: bitacora_excepcion_stock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_excepcion_stock (
    cod_excepcion integer NOT NULL,
    cod_factura integer NOT NULL,
    cod_usuario integer NOT NULL,
    cod_producto integer NOT NULL,
    nombre_producto text NOT NULL,
    stock_disponible integer DEFAULT 0 NOT NULL,
    cantidad_vendida integer NOT NULL,
    deficit integer NOT NULL,
    justificacion text,
    fecha timestamp with time zone DEFAULT now(),
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


--
-- Name: bitacora_excepcion_stock_cod_excepcion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_excepcion_stock_cod_excepcion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_excepcion_stock_cod_excepcion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_excepcion_stock_cod_excepcion_seq OWNED BY public.bitacora_excepcion_stock.cod_excepcion;


--
-- Name: bitacora_facturacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_facturacion (
    cod_bitacora integer NOT NULL,
    evento character varying(50) NOT NULL,
    entidad character varying(50) DEFAULT 'FACTURA'::character varying NOT NULL,
    cod_factura integer,
    cod_usuario integer,
    nombre_usuario character varying(150),
    detalle jsonb,
    ip character varying(45),
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bitacora_facturacion_cod_bitacora_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bitacora_facturacion_cod_bitacora_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bitacora_facturacion_cod_bitacora_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bitacora_facturacion_cod_bitacora_seq OWNED BY public.bitacora_facturacion.cod_bitacora;


--
-- Name: carrusel_imagenes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carrusel_imagenes (
    cod_imagen integer NOT NULL,
    titulo character varying(100),
    descripcion character varying(255),
    imagen_url character varying(500) NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: carrusel_imagenes_cod_imagen_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carrusel_imagenes_cod_imagen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carrusel_imagenes_cod_imagen_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carrusel_imagenes_cod_imagen_seq OWNED BY public.carrusel_imagenes.cod_imagen;


--
-- Name: cat_estado_dev; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_estado_dev (
    cod_cat_estado_dev integer NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer NOT NULL,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: cat_estado_dev_cod_cat_estado_dev_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_estado_dev_cod_cat_estado_dev_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_estado_dev_cod_cat_estado_dev_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_estado_dev_cod_cat_estado_dev_seq OWNED BY public.cat_estado_dev.cod_cat_estado_dev;


--
-- Name: cat_estado_entrega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_estado_entrega (
    cod_cat_est_entrega integer NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer NOT NULL,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: cat_estado_entrega_cod_cat_est_entrega_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_estado_entrega_cod_cat_est_entrega_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_estado_entrega_cod_cat_est_entrega_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_estado_entrega_cod_cat_est_entrega_seq OWNED BY public.cat_estado_entrega.cod_cat_est_entrega;


--
-- Name: cat_estado_orden_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_estado_orden_compra (
    cod_estado_oc integer NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


--
-- Name: cat_estado_orden_compra_cod_estado_oc_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_estado_orden_compra_cod_estado_oc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_estado_orden_compra_cod_estado_oc_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_estado_orden_compra_cod_estado_oc_seq OWNED BY public.cat_estado_orden_compra.cod_estado_oc;


--
-- Name: cat_estado_reparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_estado_reparacion (
    cod_cat_est_rep integer NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer NOT NULL,
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: cat_estado_reparacion_cod_cat_est_rep_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_estado_reparacion_cod_cat_est_rep_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_estado_reparacion_cod_cat_est_rep_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_estado_reparacion_cod_cat_est_rep_seq OWNED BY public.cat_estado_reparacion.cod_cat_est_rep;


--
-- Name: cat_metodo_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cat_metodo_pago (
    cod_cat_metodo_pago integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(200),
    estado boolean DEFAULT true NOT NULL
);


--
-- Name: cat_metodo_pago_cod_cat_metodo_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cat_metodo_pago_cod_cat_metodo_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cat_metodo_pago_cod_cat_metodo_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cat_metodo_pago_cod_cat_metodo_pago_seq OWNED BY public.cat_metodo_pago.cod_cat_metodo_pago;


--
-- Name: catalogo_isv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalogo_isv (
    cod_isv integer NOT NULL,
    porcentaje numeric(5,2) NOT NULL,
    descripcion character varying(100) NOT NULL,
    estado boolean DEFAULT true
);


--
-- Name: catalogo_isv_cod_isv_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.catalogo_isv_cod_isv_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: catalogo_isv_cod_isv_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.catalogo_isv_cod_isv_seq OWNED BY public.catalogo_isv.cod_isv;


--
-- Name: categoria_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categoria_producto (
    cod_categoria integer NOT NULL,
    nombre_categoria character varying(100) NOT NULL,
    descripcion character varying(100),
    estado_categoria boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


--
-- Name: categoria_producto_cod_categoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categoria_producto_cod_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categoria_producto_cod_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categoria_producto_cod_categoria_seq OWNED BY public.categoria_producto.cod_categoria;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    cod_cliente integer NOT NULL,
    nombre character varying(50) NOT NULL,
    apellido character varying(50),
    dni character varying(20),
    empresa character varying(80),
    telefono character varying(20),
    correo character varying(50),
    direccion character varying(200),
    rtn character varying(14)
);


--
-- Name: clientes_cod_cliente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_cod_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_cod_cliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_cod_cliente_seq OWNED BY public.clientes.cod_cliente;


--
-- Name: conteo_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conteo_inventario (
    cod_conteo_inventario integer NOT NULL,
    estado character varying(20) DEFAULT 'ABIERTO'::character varying NOT NULL,
    fecha_apertura timestamp without time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp without time zone,
    observaciones character varying(500),
    observaciones_cierre character varying(500),
    cod_usuario_apertura integer,
    cod_usuario_cierre integer,
    CONSTRAINT ck_conteo_estado CHECK (((estado)::text = ANY (ARRAY[('ABIERTO'::character varying)::text, ('CERRADO'::character varying)::text, ('ANULADO'::character varying)::text]))),
    CONSTRAINT ck_conteo_fecha_cierre_mayor_apertura CHECK (((fecha_cierre IS NULL) OR (fecha_cierre >= fecha_apertura)))
);


--
-- Name: conteo_inventario_cod_conteo_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conteo_inventario_cod_conteo_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conteo_inventario_cod_conteo_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conteo_inventario_cod_conteo_inventario_seq OWNED BY public.conteo_inventario.cod_conteo_inventario;


--
-- Name: conteo_inventario_detalle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conteo_inventario_detalle (
    cod_conteo_detalle integer NOT NULL,
    cod_conteo_inventario integer NOT NULL,
    cod_producto integer NOT NULL,
    cod_ubicacion integer NOT NULL,
    cod_inventario integer NOT NULL,
    stock_sistema integer DEFAULT 0 NOT NULL,
    stock_fisico integer NOT NULL,
    diferencia integer DEFAULT 0 NOT NULL,
    observaciones character varying(500),
    fecha_registro timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_conteo_det_stock_fisico_no_neg CHECK ((stock_fisico >= 0)),
    CONSTRAINT ck_conteo_det_stock_sistema_no_neg CHECK ((stock_sistema >= 0))
);


--
-- Name: conteo_inventario_detalle_cod_conteo_detalle_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conteo_inventario_detalle_cod_conteo_detalle_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conteo_inventario_detalle_cod_conteo_detalle_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conteo_inventario_detalle_cod_conteo_detalle_seq OWNED BY public.conteo_inventario_detalle.cod_conteo_detalle;


--
-- Name: control_calidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.control_calidad (
    cod_control_calidad integer NOT NULL,
    cod_recepcion integer NOT NULL,
    cod_usuario integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    notas character varying(200),
    evidencias_url character varying(200)
);


--
-- Name: control_calidad_cod_control_calidad_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.control_calidad_cod_control_calidad_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: control_calidad_cod_control_calidad_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.control_calidad_cod_control_calidad_seq OWNED BY public.control_calidad.cod_control_calidad;


--
-- Name: cotizacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion (
    cod_cotizacion integer NOT NULL,
    cod_cliente integer NOT NULL,
    cod_usuario integer NOT NULL,
    subtotal numeric(10,2) DEFAULT 0,
    descuento numeric(10,2) DEFAULT 0,
    descuento_global numeric(10,2) DEFAULT 0,
    tipo_descuento_global text,
    monto_descuento_global numeric(10,2) DEFAULT 0,
    isv numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    estado_cotizacion text DEFAULT 'VIGENTE'::text,
    vigencia_dias integer DEFAULT 15,
    fecha_vencimiento timestamp with time zone,
    observaciones text,
    cod_factura integer,
    estado boolean DEFAULT true,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


--
-- Name: cotizacion_cod_cotizacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cotizacion_cod_cotizacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cotizacion_cod_cotizacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cotizacion_cod_cotizacion_seq OWNED BY public.cotizacion.cod_cotizacion;


--
-- Name: detalle_cotizacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_cotizacion (
    cod_detalle_cotizacion integer NOT NULL,
    cod_cotizacion integer NOT NULL,
    tipo_item text DEFAULT 'PRODUCTO'::text NOT NULL,
    cod_producto integer,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    tipo_descuento text DEFAULT 'PORCENTAJE'::text NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    monto_descuento numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


--
-- Name: detalle_cotizacion_cod_detalle_cotizacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_cotizacion_cod_detalle_cotizacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_cotizacion_cod_detalle_cotizacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_cotizacion_cod_detalle_cotizacion_seq OWNED BY public.detalle_cotizacion.cod_detalle_cotizacion;


--
-- Name: detalle_dev_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_dev_cliente (
    cod_detalle_dev_cliente integer NOT NULL,
    cod_dev_cliente integer NOT NULL,
    cod_detalle_factura integer NOT NULL,
    cantidad integer NOT NULL,
    motivo character varying(200),
    CONSTRAINT ck_ddc_cant CHECK ((cantidad > 0))
);


--
-- Name: detalle_dev_cliente_cod_detalle_dev_cliente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_dev_cliente_cod_detalle_dev_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_dev_cliente_cod_detalle_dev_cliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_dev_cliente_cod_detalle_dev_cliente_seq OWNED BY public.detalle_dev_cliente.cod_detalle_dev_cliente;


--
-- Name: detalle_factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_factura (
    cod_detalle_factura integer NOT NULL,
    cod_factura integer NOT NULL,
    tipo_item text NOT NULL,
    cod_producto integer,
    cod_servicio integer,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    descuento numeric(10,2) DEFAULT 0,
    tipo_descuento text DEFAULT 'PORCENTAJE'::text NOT NULL,
    monto_descuento numeric(10,2) DEFAULT 0 NOT NULL,
    descripcion_item text,
    CONSTRAINT ck_df_cant CHECK ((cantidad > 0)),
    CONSTRAINT ck_df_isv CHECK ((isv >= (0)::numeric)),
    CONSTRAINT ck_df_item_valido CHECK ((((tipo_item = 'PRODUCTO'::text) AND (cod_producto IS NOT NULL) AND (cod_servicio IS NULL)) OR ((tipo_item = 'SERVICIO'::text) AND (cod_servicio IS NOT NULL) AND (cod_producto IS NULL)))),
    CONSTRAINT ck_df_precio CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT ck_df_subtotal CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT ck_df_tipo_item CHECK ((tipo_item = ANY (ARRAY['PRODUCTO'::text, 'SERVICIO'::text]))),
    CONSTRAINT ck_df_total CHECK ((total >= (0)::numeric))
);


--
-- Name: detalle_factura_cod_detalle_factura_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_factura_cod_detalle_factura_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_factura_cod_detalle_factura_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_factura_cod_detalle_factura_seq OWNED BY public.detalle_factura.cod_detalle_factura;


--
-- Name: detalle_nota_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalle_nota_credito (
    cod_detalle_nc integer NOT NULL,
    cod_nota_credito integer NOT NULL,
    cod_detalle_factura integer NOT NULL,
    cod_producto integer,
    cantidad_devuelta integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: detalle_nota_credito_cod_detalle_nc_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalle_nota_credito_cod_detalle_nc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_nota_credito_cod_detalle_nc_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalle_nota_credito_cod_detalle_nc_seq OWNED BY public.detalle_nota_credito.cod_detalle_nc;


--
-- Name: detalles_control_calidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_control_calidad (
    cod_detalle_cc integer NOT NULL,
    cod_control_calidad integer NOT NULL,
    cod_producto integer NOT NULL,
    estado text NOT NULL,
    cantidad_observada numeric(10,2) DEFAULT 0 NOT NULL,
    evidencias_url character varying(200),
    CONSTRAINT ck_cant_obs CHECK ((cantidad_observada >= (0)::numeric)),
    CONSTRAINT ck_estado_cc CHECK ((estado = ANY (ARRAY['APROBADO'::text, 'RECHAZADO'::text, 'PENDIENTE'::text, 'OBSERVADO'::text])))
);


--
-- Name: detalles_control_calidad_cod_detalle_cc_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalles_control_calidad_cod_detalle_cc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalles_control_calidad_cod_detalle_cc_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalles_control_calidad_cod_detalle_cc_seq OWNED BY public.detalles_control_calidad.cod_detalle_cc;


--
-- Name: detalles_devoluciones_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_devoluciones_proveedor (
    cod_detalles_dev_prov integer NOT NULL,
    cod_devoluciones integer NOT NULL,
    cod_producto integer NOT NULL,
    cantidad integer NOT NULL,
    motivo character varying(200),
    CONSTRAINT ck_ddp_cant CHECK ((cantidad > 0))
);


--
-- Name: detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq OWNED BY public.detalles_devoluciones_proveedor.cod_detalles_dev_prov;


--
-- Name: detalles_orden_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_orden_compra (
    cod_detalle_oc integer NOT NULL,
    cod_orden_compra integer NOT NULL,
    cod_producto integer NOT NULL,
    cantidad integer NOT NULL,
    precio numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT ck_doc_cant CHECK ((cantidad > 0)),
    CONSTRAINT ck_doc_isv CHECK ((isv >= (0)::numeric)),
    CONSTRAINT ck_doc_precio CHECK ((precio >= (0)::numeric)),
    CONSTRAINT ck_doc_subtotal CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: detalles_orden_compra_cod_detalle_oc_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalles_orden_compra_cod_detalle_oc_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalles_orden_compra_cod_detalle_oc_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalles_orden_compra_cod_detalle_oc_seq OWNED BY public.detalles_orden_compra.cod_detalle_oc;


--
-- Name: detalles_recepcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_recepcion (
    cod_detalles_recepcion integer NOT NULL,
    cod_recepcion integer NOT NULL,
    cod_producto integer NOT NULL,
    cantidad_recibida integer NOT NULL,
    cantidad_danada integer DEFAULT 0 NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_rec_cant CHECK ((cantidad_recibida > 0)),
    CONSTRAINT ck_rec_danada CHECK ((cantidad_danada >= 0))
);


--
-- Name: detalles_recepcion_cod_detalles_recepcion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.detalles_recepcion_cod_detalles_recepcion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalles_recepcion_cod_detalles_recepcion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.detalles_recepcion_cod_detalles_recepcion_seq OWNED BY public.detalles_recepcion.cod_detalles_recepcion;


--
-- Name: dev_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_cliente (
    cod_dev_cliente integer NOT NULL,
    cod_factura integer NOT NULL,
    cod_estado_devolucion integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    motivo character varying(200)
);


--
-- Name: dev_cliente_cod_dev_cliente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dev_cliente_cod_dev_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dev_cliente_cod_dev_cliente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dev_cliente_cod_dev_cliente_seq OWNED BY public.dev_cliente.cod_dev_cliente;


--
-- Name: devoluciones_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.devoluciones_proveedor (
    cod_devo_prov integer NOT NULL,
    cod_proveedor integer NOT NULL,
    cod_recepcion integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    cod_estado_devolucion integer NOT NULL,
    motivo character varying(200)
);


--
-- Name: devoluciones_proveedor_cod_devo_prov_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.devoluciones_proveedor_cod_devo_prov_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: devoluciones_proveedor_cod_devo_prov_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.devoluciones_proveedor_cod_devo_prov_seq OWNED BY public.devoluciones_proveedor.cod_devo_prov;


--
-- Name: empresa_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empresa_config (
    cod_config integer NOT NULL,
    nombre character varying(100) NOT NULL,
    rtn character varying(20) NOT NULL,
    direccion character varying(300) NOT NULL,
    telefono character varying(50) NOT NULL,
    correo character varying(100) NOT NULL,
    cai character varying(50),
    rango_autorizado character varying(100),
    fecha_limite_emision date,
    propietaria character varying(100),
    garantia character varying(200),
    actualizado_en timestamp with time zone,
    logo_factura_url character varying(300)
);


--
-- Name: empresa_config_cod_config_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empresa_config_cod_config_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empresa_config_cod_config_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empresa_config_cod_config_seq OWNED BY public.empresa_config.cod_config;


--
-- Name: entrega; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entrega (
    cod_entrega integer NOT NULL,
    cod_factura integer NOT NULL,
    cod_estado_entrega integer NOT NULL,
    usuario_repartidor integer,
    direccion character varying(200) NOT NULL,
    referencia character varying(200),
    fecha_programado timestamp without time zone,
    fecha_entrega timestamp without time zone
);


--
-- Name: entrega_cod_entrega_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entrega_cod_entrega_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entrega_cod_entrega_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entrega_cod_entrega_seq OWNED BY public.entrega.cod_entrega;


--
-- Name: equipo_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipo_cliente (
    cod_equipo integer NOT NULL,
    cod_cliente integer NOT NULL,
    tipo character varying(100) NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    serie character varying(100),
    descripcion character varying(100)
);


--
-- Name: equipo_cliente_cod_equipo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipo_cliente_cod_equipo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipo_cliente_cod_equipo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipo_cliente_cod_equipo_seq OWNED BY public.equipo_cliente.cod_equipo;


--
-- Name: estado_orden_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_orden_compra (
    cod_est_orden_compra integer NOT NULL,
    cod_orden_compra integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    cod_estado_oc integer NOT NULL,
    observaciones character varying(100)
);


--
-- Name: estado_orden_compra_cod_est_orden_compra_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_orden_compra_cod_est_orden_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_orden_compra_cod_est_orden_compra_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_orden_compra_cod_est_orden_compra_seq OWNED BY public.estado_orden_compra.cod_est_orden_compra;


--
-- Name: estado_reparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estado_reparacion (
    cod_estado_reparacion integer NOT NULL,
    cod_orden_reparacion integer NOT NULL,
    cod_estado_reparacion_cat integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    observaciones character varying(200)
);


--
-- Name: estado_reparacion_cod_estado_reparacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estado_reparacion_cod_estado_reparacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estado_reparacion_cod_estado_reparacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estado_reparacion_cod_estado_reparacion_seq OWNED BY public.estado_reparacion.cod_estado_reparacion;


--
-- Name: factura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.factura (
    cod_factura integer NOT NULL,
    cod_cliente integer NOT NULL,
    cod_usuario integer NOT NULL,
    metodo_pago integer,
    ref_pago character varying(200),
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now(),
    descuento numeric(10,2) DEFAULT 0,
    descuento_global numeric(10,2) DEFAULT 0,
    tipo_descuento_global text,
    monto_descuento_global numeric(10,2) DEFAULT 0,
    descuento_aplicado_por integer,
    estado_pago text DEFAULT 'PENDIENTE'::text,
    total_pagado numeric(10,2) DEFAULT 0,
    saldo numeric(10,2) DEFAULT 0,
    cai character varying(50),
    rango_autorizado character varying(100),
    fecha_limite_emision date,
    valor_en_letras character varying(300),
    observaciones character varying(300),
    garantia_filtracion_agua boolean,
    firma character varying(100),
    motivo_anulacion text,
    anulada_por integer,
    fecha_anulacion timestamp without time zone,
    CONSTRAINT ck_fac_isv CHECK ((isv >= (0)::numeric)),
    CONSTRAINT ck_fac_subtotal CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT ck_fac_total CHECK ((total >= (0)::numeric))
);


--
-- Name: factura_cod_factura_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.factura_cod_factura_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: factura_cod_factura_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.factura_cod_factura_seq OWNED BY public.factura.cod_factura;


--
-- Name: grupo_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo_cliente (
    cod_grupo integer NOT NULL,
    cod_cliente integer NOT NULL,
    tipo character varying(100) NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    serie character varying(100),
    descripcion character varying(100)
);


--
-- Name: grupo_cliente_cod_grupo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupo_cliente_cod_grupo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupo_cliente_cod_grupo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupo_cliente_cod_grupo_seq OWNED BY public.grupo_cliente.cod_grupo;


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    cod_inventario integer NOT NULL,
    cod_producto integer NOT NULL,
    cod_ubicacion integer NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    stock_minimo integer DEFAULT 0 NOT NULL,
    stock_maximo integer DEFAULT 0 NOT NULL,
    fecha_ult_mov timestamp without time zone,
    stock_reservado integer DEFAULT 0 NOT NULL,
    CONSTRAINT ck_inv_min_le_max CHECK ((stock_minimo <= stock_maximo)),
    CONSTRAINT ck_inv_stock_reservado_le_stock CHECK ((stock_reservado <= stock)),
    CONSTRAINT ck_inv_stock_reservado_no_neg CHECK ((COALESCE(stock_reservado, 0) >= 0)),
    CONSTRAINT ck_stock_max_no_neg CHECK ((stock_maximo >= 0)),
    CONSTRAINT ck_stock_min_no_neg CHECK ((stock_minimo >= 0)),
    CONSTRAINT ck_stock_no_neg CHECK ((stock >= 0)),
    CONSTRAINT ck_stock_reservado_no_neg CHECK ((stock_reservado >= 0))
);


--
-- Name: inventario_cod_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_cod_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_cod_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_cod_inventario_seq OWNED BY public.inventario.cod_inventario;


--
-- Name: movimiento_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimiento_inventario (
    cod_mov_inv integer NOT NULL,
    cod_inventario integer NOT NULL,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    motivo character varying(200),
    ref_tipo text,
    ref_id integer,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    cod_usuario integer,
    referencia_documento character varying(200),
    observaciones character varying(500),
    CONSTRAINT ck_cantidad_pos CHECK ((cantidad > 0)),
    CONSTRAINT ck_tipo_mov CHECK ((tipo = ANY (ARRAY['ENTRADA'::text, 'SALIDA'::text, 'AJUSTE'::text, 'BAJA'::text, 'DEVOLUCION'::text, 'COMPRA'::text])))
);


--
-- Name: movimiento_inventario_cod_mov_inv_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movimiento_inventario_cod_mov_inv_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movimiento_inventario_cod_mov_inv_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movimiento_inventario_cod_mov_inv_seq OWNED BY public.movimiento_inventario.cod_mov_inv;


--
-- Name: nota_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nota_credito (
    cod_nota_credito integer NOT NULL,
    cod_factura integer NOT NULL,
    cod_usuario integer NOT NULL,
    motivo text NOT NULL,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    descuento numeric(10,2) DEFAULT 0 NOT NULL,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    devolver_inventario boolean DEFAULT true NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: nota_credito_cod_nota_credito_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nota_credito_cod_nota_credito_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nota_credito_cod_nota_credito_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nota_credito_cod_nota_credito_seq OWNED BY public.nota_credito.cod_nota_credito;


--
-- Name: notificaciones_super_admin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones_super_admin (
    cod_notificacion integer NOT NULL,
    tipo character varying(40) DEFAULT 'RECUPERACION_PASSWORD'::character varying NOT NULL,
    titulo character varying(120) NOT NULL,
    mensaje text NOT NULL,
    correo_solicitante character varying(150),
    leida boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone NOT NULL
);


--
-- Name: notificaciones_super_admin_cod_notificacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notificaciones_super_admin_cod_notificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificaciones_super_admin_cod_notificacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notificaciones_super_admin_cod_notificacion_seq OWNED BY public.notificaciones_super_admin.cod_notificacion;


--
-- Name: notificaciones_super_admin_leidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones_super_admin_leidas (
    cod_notificacion integer NOT NULL,
    cod_usuario integer NOT NULL,
    leida_en timestamp with time zone NOT NULL
);


--
-- Name: orden_compra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_compra (
    cod_orden_compra integer NOT NULL,
    cod_proveedor integer NOT NULL,
    cod_usuario integer NOT NULL,
    cod_estado_oc integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    moneda character varying(3) DEFAULT 'HNL'::character varying NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    observaciones character varying(200),
    CONSTRAINT ck_oc_total CHECK ((total >= (0)::numeric))
);


--
-- Name: orden_compra_cod_orden_compra_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_compra_cod_orden_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_compra_cod_orden_compra_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_compra_cod_orden_compra_seq OWNED BY public.orden_compra.cod_orden_compra;


--
-- Name: orden_reparacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orden_reparacion (
    cod_orden_reparacion integer NOT NULL,
    cod_cliente integer NOT NULL,
    cod_equipo integer NOT NULL,
    cod_estado_reparacion integer NOT NULL,
    fecha_ingreso timestamp without time zone DEFAULT now() NOT NULL,
    fecha_entrega_est timestamp without time zone
);


--
-- Name: orden_reparacion_cod_orden_reparacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orden_reparacion_cod_orden_reparacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orden_reparacion_cod_orden_reparacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orden_reparacion_cod_orden_reparacion_seq OWNED BY public.orden_reparacion.cod_orden_reparacion;


--
-- Name: pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pago (
    cod_pago integer NOT NULL,
    cod_factura integer NOT NULL,
    monto numeric(10,2) NOT NULL,
    metodo_pago integer NOT NULL,
    ref_pago character varying(200),
    fecha_pago timestamp without time zone DEFAULT now() NOT NULL,
    observacion text,
    estado boolean DEFAULT true,
    cod_usuario integer NOT NULL
);


--
-- Name: pago_cod_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pago_cod_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pago_cod_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pago_cod_pago_seq OWNED BY public.pago.cod_pago;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    cod_pagos integer NOT NULL,
    cod_factura integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    monto numeric(10,2) DEFAULT 0 NOT NULL,
    metodo_pago integer NOT NULL,
    referencia character varying(100),
    CONSTRAINT ck_pag_monto CHECK ((monto >= (0)::numeric))
);


--
-- Name: pagos_cod_pagos_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_cod_pagos_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_cod_pagos_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_cod_pagos_seq OWNED BY public.pagos.cod_pagos;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permisos (
    cod_permiso integer NOT NULL,
    nombre_permiso character varying(80) NOT NULL,
    descripcion character varying(80),
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: permisos_cod_permiso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permisos_cod_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permisos_cod_permiso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permisos_cod_permiso_seq OWNED BY public.permisos.cod_permiso;


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id_persona integer NOT NULL,
    nombre character varying(100) NOT NULL,
    apellido character varying(100) NOT NULL,
    correo character varying(150) NOT NULL,
    telefono character varying(20),
    fecha_nacimiento date,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT now()
);


--
-- Name: personas_id_persona_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personas_id_persona_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personas_id_persona_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personas_id_persona_seq OWNED BY public.personas.id_persona;


--
-- Name: producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto (
    cod_producto integer NOT NULL,
    cod_categoria integer NOT NULL,
    nombre_producto character varying(100) NOT NULL,
    unidad_medida character varying(10),
    precio_venta numeric(10,2) DEFAULT 0 NOT NULL,
    cod_isv integer,
    estado_producto character varying(15) DEFAULT 'Activo'::character varying NOT NULL,
    imagen_url character varying(500) DEFAULT NULL::character varying,
    cod_ubicacion integer,
    creado_por integer,
    fecha_creacion timestamp without time zone,
    modificado_por integer,
    fecha_modificacion timestamp without time zone,
    precio_costo numeric(10,2),
    descripcion character varying(500),
    especificaciones jsonb,
    stock_minimo integer,
    punto_reorden integer,
    CONSTRAINT chk_estado_producto CHECK (((estado_producto)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text, ('Descontinuado'::character varying)::text])))
);


--
-- Name: producto_cod_producto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.producto_cod_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_cod_producto_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.producto_cod_producto_seq OWNED BY public.producto.cod_producto;


--
-- Name: producto_proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.producto_proveedor (
    cod_producto_proveedor integer NOT NULL,
    cod_producto integer NOT NULL,
    cod_proveedor integer NOT NULL,
    precio_compra numeric(10,2) DEFAULT 0 NOT NULL,
    moneda character varying(3) DEFAULT 'HNL'::character varying NOT NULL,
    lead_time_dias integer,
    es_preferido smallint DEFAULT 0 NOT NULL,
    estado_producto_prov boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_pp_precio CHECK ((precio_compra >= (0)::numeric))
);


--
-- Name: producto_proveedor_cod_producto_proveedor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.producto_proveedor_cod_producto_proveedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_proveedor_cod_producto_proveedor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.producto_proveedor_cod_producto_proveedor_seq OWNED BY public.producto_proveedor.cod_producto_proveedor;


--
-- Name: proveedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedor (
    cod_proveedor integer NOT NULL,
    nombre_proveedor character varying(100) NOT NULL,
    telefono character varying(20),
    correo character varying(100),
    pais character varying(50),
    es_internacional boolean DEFAULT false NOT NULL,
    validado character varying(100),
    estado_proveedor boolean DEFAULT true NOT NULL,
    apellido_proveedor character varying(100) DEFAULT ''::character varying NOT NULL,
    empresa_proveedor character varying(120) DEFAULT ''::character varying NOT NULL
);


--
-- Name: proveedor_cod_proveedor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedor_cod_proveedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedor_cod_proveedor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedor_cod_proveedor_seq OWNED BY public.proveedor.cod_proveedor;


--
-- Name: recepcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recepcion (
    cod_recepcion integer NOT NULL,
    cod_orden_compra integer NOT NULL,
    cod_usuario integer NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    documento_ref character varying(60),
    observaciones character varying(200)
);


--
-- Name: recepcion_cod_recepcion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recepcion_cod_recepcion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recepcion_cod_recepcion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recepcion_cod_recepcion_seq OWNED BY public.recepcion.cod_recepcion;


--
-- Name: reserva_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reserva_inventario (
    cod_reserva_inventario integer NOT NULL,
    cod_inventario integer NOT NULL,
    cod_producto integer NOT NULL,
    cod_ubicacion integer NOT NULL,
    cantidad integer NOT NULL,
    estado character varying(20) DEFAULT 'ACTIVA'::character varying NOT NULL,
    referencia character varying(200),
    observaciones character varying(500),
    motivo_liberacion character varying(200),
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_liberacion timestamp without time zone,
    fecha_consumo timestamp without time zone,
    cod_usuario_creacion integer,
    cod_usuario_liberacion integer,
    cod_usuario_consumo integer,
    CONSTRAINT ck_reserva_cantidad_pos CHECK ((cantidad > 0)),
    CONSTRAINT ck_reserva_estado CHECK (((estado)::text = ANY (ARRAY[('ACTIVA'::character varying)::text, ('LIBERADA'::character varying)::text, ('CONSUMIDA'::character varying)::text, ('ANULADA'::character varying)::text]))),
    CONSTRAINT ck_reserva_estado_fecha CHECK (((((estado)::text <> 'LIBERADA'::text) OR (fecha_liberacion IS NOT NULL)) AND (((estado)::text <> 'CONSUMIDA'::text) OR (fecha_consumo IS NOT NULL)))),
    CONSTRAINT ck_reserva_fechas_consistentes CHECK ((((fecha_liberacion IS NULL) OR (fecha_liberacion >= fecha_creacion)) AND ((fecha_consumo IS NULL) OR (fecha_consumo >= fecha_creacion)) AND (NOT ((fecha_liberacion IS NOT NULL) AND (fecha_consumo IS NOT NULL)))))
);


--
-- Name: reserva_inventario_cod_reserva_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reserva_inventario_cod_reserva_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reserva_inventario_cod_reserva_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reserva_inventario_cod_reserva_inventario_seq OWNED BY public.reserva_inventario.cod_reserva_inventario;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    cod_rol integer NOT NULL,
    nombre_rol character varying(50) NOT NULL,
    descripcion character varying(100),
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: roles_cod_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_cod_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_cod_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_cod_rol_seq OWNED BY public.roles.cod_rol;


--
-- Name: roles_permisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles_permisos (
    cod_rol_permiso integer NOT NULL,
    cod_rol integer NOT NULL,
    cod_permiso integer NOT NULL
);


--
-- Name: roles_permisos_cod_rol_permiso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_permisos_cod_rol_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_permisos_cod_rol_permiso_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_permisos_cod_rol_permiso_seq OWNED BY public.roles_permisos.cod_rol_permiso;


--
-- Name: servicios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicios (
    cod_servicio integer NOT NULL,
    nombre_servicios character varying(100) NOT NULL,
    precio numeric(10,2) DEFAULT 0 NOT NULL,
    tiempo_minutos integer,
    isv numeric(10,2) DEFAULT 0 NOT NULL,
    estado_servicios boolean DEFAULT true NOT NULL,
    CONSTRAINT ck_serv_isv CHECK ((isv >= (0)::numeric)),
    CONSTRAINT ck_serv_precio CHECK ((precio >= (0)::numeric))
);


--
-- Name: servicios_cod_servicio_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servicios_cod_servicio_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servicios_cod_servicio_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servicios_cod_servicio_seq OWNED BY public.servicios.cod_servicio;


--
-- Name: transferencia_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencia_inventario (
    cod_transferencia_inventario integer NOT NULL,
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
    estado character varying(20) DEFAULT 'COMPLETADA'::character varying NOT NULL,
    fecha timestamp without time zone DEFAULT now() NOT NULL,
    fecha_anulacion timestamp without time zone,
    cod_usuario_anulacion integer,
    cod_movimiento_salida_anulacion integer,
    cod_movimiento_entrada_anulacion integer,
    CONSTRAINT ck_transferencia_cantidad_pos CHECK ((cantidad > 0)),
    CONSTRAINT ck_transferencia_estado CHECK (((estado)::text = ANY (ARRAY[('COMPLETADA'::character varying)::text, ('ANULADA'::character varying)::text]))),
    CONSTRAINT ck_transferencia_origen_destino_distintos CHECK ((cod_ubicacion_origen <> cod_ubicacion_destino))
);


--
-- Name: transferencia_inventario_cod_transferencia_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transferencia_inventario_cod_transferencia_inventario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transferencia_inventario_cod_transferencia_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transferencia_inventario_cod_transferencia_inventario_seq OWNED BY public.transferencia_inventario.cod_transferencia_inventario;


--
-- Name: ubicacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ubicacion (
    cod_ubicacion integer NOT NULL,
    pasillo character varying(15),
    estanteria character varying(15),
    nivel_1 character varying(15),
    nivel_2 character varying(15),
    codigo_producto character varying(15) NOT NULL,
    descripcion character varying(100),
    estado_ubi text DEFAULT 'ACTIVA'::text NOT NULL,
    cod_producto integer NOT NULL,
    CONSTRAINT ck_estado_ubi CHECK ((estado_ubi = ANY (ARRAY['ACTIVA'::text, 'INACTIVA'::text, 'BLOQUEADA'::text]))),
    CONSTRAINT ck_ubicacion_codigo_producto_consistente CHECK (((codigo_producto)::text = upper(concat('PROD-', lpad((cod_producto)::text, 4, '0'::text)))))
);


--
-- Name: ubicacion_cod_ubicacion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ubicacion_cod_ubicacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ubicacion_cod_ubicacion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ubicacion_cod_ubicacion_seq OWNED BY public.ubicacion.cod_ubicacion;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    cod_usuario integer NOT NULL,
    nombre_usuario character varying(80) NOT NULL,
    contrasena text NOT NULL,
    estado_usuario boolean DEFAULT true NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL,
    token_recuperacion text,
    expiracion_token timestamp without time zone
);


--
-- Name: usuarios_cod_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_cod_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_cod_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_cod_usuario_seq OWNED BY public.usuarios.cod_usuario;


--
-- Name: usuarios_rol; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios_rol (
    cod_usuario integer NOT NULL,
    cod_rol integer NOT NULL,
    fecha_asignacion timestamp without time zone DEFAULT now() NOT NULL,
    estado smallint DEFAULT 1 NOT NULL
);


--
-- Name: vw_factura_detalle; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_factura_detalle AS
 SELECT df.cod_factura,
    df.cod_detalle_factura,
    df.tipo_item,
    COALESCE(p.nombre_producto, s.nombre_servicios) AS item_nombre,
    df.cantidad,
    df.precio_unitario,
    df.isv,
    df.subtotal,
    df.total
   FROM ((public.detalle_factura df
     LEFT JOIN public.producto p ON ((p.cod_producto = df.cod_producto)))
     LEFT JOIN public.servicios s ON ((s.cod_servicio = df.cod_servicio)));


--
-- Name: vw_factura_resumen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_factura_resumen AS
 SELECT f.cod_factura,
    f.cod_cliente,
    c.nombre,
    c.apellido,
    f.cod_usuario,
    u.nombre_usuario,
    f.metodo_pago,
    mp.nombre AS metodo_pago_nombre,
    f.ref_pago,
    f.subtotal,
    f.isv,
    f.total,
    f.estado
   FROM (((public.factura f
     JOIN public.clientes c ON ((c.cod_cliente = f.cod_cliente)))
     JOIN public.usuarios u ON ((u.cod_usuario = f.cod_usuario)))
     LEFT JOIN public.cat_metodo_pago mp ON ((mp.cod_cat_metodo_pago = f.metodo_pago)));


--
-- Name: vw_inventario_actual; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_inventario_actual AS
 SELECT i.cod_inventario,
    p.cod_producto,
    p.nombre_producto,
    i.stock,
    i.stock_minimo,
    i.stock_maximo,
    u.cod_ubicacion,
    u.pasillo,
    u.estanteria,
    u.nivel_1,
    u.nivel_2,
    u.codigo_producto AS codigo_qr,
    i.fecha_ult_mov
   FROM ((public.inventario i
     JOIN public.producto p ON ((p.cod_producto = i.cod_producto)))
     JOIN public.ubicacion u ON ((u.cod_ubicacion = i.cod_ubicacion)));


--
-- Name: vw_orden_compra_resumen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_orden_compra_resumen AS
 SELECT oc.cod_orden_compra,
    oc.fecha,
    oc.moneda,
    oc.total,
    oc.observaciones,
    pr.cod_proveedor,
    pr.nombre_proveedor,
    oc.cod_usuario,
    u.nombre_usuario,
    oc.cod_estado_oc,
    ce.nombre AS estado_nombre
   FROM (((public.orden_compra oc
     JOIN public.proveedor pr ON ((pr.cod_proveedor = oc.cod_proveedor)))
     JOIN public.usuarios u ON ((u.cod_usuario = oc.cod_usuario)))
     JOIN public.cat_estado_orden_compra ce ON ((ce.cod_estado_oc = oc.cod_estado_oc)));


--
-- Name: vw_usuario_roles_permisos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_usuario_roles_permisos AS
 SELECT us.cod_usuario,
    us.nombre_usuario,
    r.cod_rol,
    r.nombre_rol,
    p.cod_permiso,
    p.nombre_permiso
   FROM ((((public.usuarios us
     JOIN public.usuarios_rol ur ON ((ur.cod_usuario = us.cod_usuario)))
     JOIN public.roles r ON ((r.cod_rol = ur.cod_rol)))
     JOIN public.roles_permisos rp ON ((rp.cod_rol = r.cod_rol)))
     JOIN public.permisos p ON ((p.cod_permiso = rp.cod_permiso)));


--
-- Name: baja_inventario cod_baja_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario ALTER COLUMN cod_baja_inventario SET DEFAULT nextval('public.baja_inventario_cod_baja_inventario_seq'::regclass);


--
-- Name: bitacora_anulacion cod_bitacora; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_anulacion ALTER COLUMN cod_bitacora SET DEFAULT nextval('public.bitacora_anulacion_cod_bitacora_seq'::regclass);


--
-- Name: bitacora_excepcion_stock cod_excepcion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_excepcion_stock ALTER COLUMN cod_excepcion SET DEFAULT nextval('public.bitacora_excepcion_stock_cod_excepcion_seq'::regclass);


--
-- Name: bitacora_facturacion cod_bitacora; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_facturacion ALTER COLUMN cod_bitacora SET DEFAULT nextval('public.bitacora_facturacion_cod_bitacora_seq'::regclass);


--
-- Name: carrusel_imagenes cod_imagen; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrusel_imagenes ALTER COLUMN cod_imagen SET DEFAULT nextval('public.carrusel_imagenes_cod_imagen_seq'::regclass);


--
-- Name: cat_estado_dev cod_cat_estado_dev; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_dev ALTER COLUMN cod_cat_estado_dev SET DEFAULT nextval('public.cat_estado_dev_cod_cat_estado_dev_seq'::regclass);


--
-- Name: cat_estado_entrega cod_cat_est_entrega; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_entrega ALTER COLUMN cod_cat_est_entrega SET DEFAULT nextval('public.cat_estado_entrega_cod_cat_est_entrega_seq'::regclass);


--
-- Name: cat_estado_orden_compra cod_estado_oc; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_orden_compra ALTER COLUMN cod_estado_oc SET DEFAULT nextval('public.cat_estado_orden_compra_cod_estado_oc_seq'::regclass);


--
-- Name: cat_estado_reparacion cod_cat_est_rep; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_reparacion ALTER COLUMN cod_cat_est_rep SET DEFAULT nextval('public.cat_estado_reparacion_cod_cat_est_rep_seq'::regclass);


--
-- Name: cat_metodo_pago cod_cat_metodo_pago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodo_pago ALTER COLUMN cod_cat_metodo_pago SET DEFAULT nextval('public.cat_metodo_pago_cod_cat_metodo_pago_seq'::regclass);


--
-- Name: catalogo_isv cod_isv; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_isv ALTER COLUMN cod_isv SET DEFAULT nextval('public.catalogo_isv_cod_isv_seq'::regclass);


--
-- Name: categoria_producto cod_categoria; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_producto ALTER COLUMN cod_categoria SET DEFAULT nextval('public.categoria_producto_cod_categoria_seq'::regclass);


--
-- Name: clientes cod_cliente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN cod_cliente SET DEFAULT nextval('public.clientes_cod_cliente_seq'::regclass);


--
-- Name: conteo_inventario cod_conteo_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario ALTER COLUMN cod_conteo_inventario SET DEFAULT nextval('public.conteo_inventario_cod_conteo_inventario_seq'::regclass);


--
-- Name: conteo_inventario_detalle cod_conteo_detalle; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle ALTER COLUMN cod_conteo_detalle SET DEFAULT nextval('public.conteo_inventario_detalle_cod_conteo_detalle_seq'::regclass);


--
-- Name: control_calidad cod_control_calidad; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_calidad ALTER COLUMN cod_control_calidad SET DEFAULT nextval('public.control_calidad_cod_control_calidad_seq'::regclass);


--
-- Name: cotizacion cod_cotizacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion ALTER COLUMN cod_cotizacion SET DEFAULT nextval('public.cotizacion_cod_cotizacion_seq'::regclass);


--
-- Name: detalle_cotizacion cod_detalle_cotizacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_cotizacion ALTER COLUMN cod_detalle_cotizacion SET DEFAULT nextval('public.detalle_cotizacion_cod_detalle_cotizacion_seq'::regclass);


--
-- Name: detalle_dev_cliente cod_detalle_dev_cliente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_dev_cliente ALTER COLUMN cod_detalle_dev_cliente SET DEFAULT nextval('public.detalle_dev_cliente_cod_detalle_dev_cliente_seq'::regclass);


--
-- Name: detalle_factura cod_detalle_factura; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura ALTER COLUMN cod_detalle_factura SET DEFAULT nextval('public.detalle_factura_cod_detalle_factura_seq'::regclass);


--
-- Name: detalle_nota_credito cod_detalle_nc; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_nota_credito ALTER COLUMN cod_detalle_nc SET DEFAULT nextval('public.detalle_nota_credito_cod_detalle_nc_seq'::regclass);


--
-- Name: detalles_control_calidad cod_detalle_cc; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_control_calidad ALTER COLUMN cod_detalle_cc SET DEFAULT nextval('public.detalles_control_calidad_cod_detalle_cc_seq'::regclass);


--
-- Name: detalles_devoluciones_proveedor cod_detalles_dev_prov; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_devoluciones_proveedor ALTER COLUMN cod_detalles_dev_prov SET DEFAULT nextval('public.detalles_devoluciones_proveedor_cod_detalles_dev_prov_seq'::regclass);


--
-- Name: detalles_orden_compra cod_detalle_oc; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra ALTER COLUMN cod_detalle_oc SET DEFAULT nextval('public.detalles_orden_compra_cod_detalle_oc_seq'::regclass);


--
-- Name: detalles_recepcion cod_detalles_recepcion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion ALTER COLUMN cod_detalles_recepcion SET DEFAULT nextval('public.detalles_recepcion_cod_detalles_recepcion_seq'::regclass);


--
-- Name: dev_cliente cod_dev_cliente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cliente ALTER COLUMN cod_dev_cliente SET DEFAULT nextval('public.dev_cliente_cod_dev_cliente_seq'::regclass);


--
-- Name: devoluciones_proveedor cod_devo_prov; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor ALTER COLUMN cod_devo_prov SET DEFAULT nextval('public.devoluciones_proveedor_cod_devo_prov_seq'::regclass);


--
-- Name: empresa_config cod_config; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_config ALTER COLUMN cod_config SET DEFAULT nextval('public.empresa_config_cod_config_seq'::regclass);


--
-- Name: entrega cod_entrega; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entrega ALTER COLUMN cod_entrega SET DEFAULT nextval('public.entrega_cod_entrega_seq'::regclass);


--
-- Name: equipo_cliente cod_equipo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_cliente ALTER COLUMN cod_equipo SET DEFAULT nextval('public.equipo_cliente_cod_equipo_seq'::regclass);


--
-- Name: estado_orden_compra cod_est_orden_compra; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden_compra ALTER COLUMN cod_est_orden_compra SET DEFAULT nextval('public.estado_orden_compra_cod_est_orden_compra_seq'::regclass);


--
-- Name: estado_reparacion cod_estado_reparacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_reparacion ALTER COLUMN cod_estado_reparacion SET DEFAULT nextval('public.estado_reparacion_cod_estado_reparacion_seq'::regclass);


--
-- Name: factura cod_factura; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura ALTER COLUMN cod_factura SET DEFAULT nextval('public.factura_cod_factura_seq'::regclass);


--
-- Name: grupo_cliente cod_grupo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_cliente ALTER COLUMN cod_grupo SET DEFAULT nextval('public.grupo_cliente_cod_grupo_seq'::regclass);


--
-- Name: inventario cod_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario ALTER COLUMN cod_inventario SET DEFAULT nextval('public.inventario_cod_inventario_seq'::regclass);


--
-- Name: movimiento_inventario cod_mov_inv; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario ALTER COLUMN cod_mov_inv SET DEFAULT nextval('public.movimiento_inventario_cod_mov_inv_seq'::regclass);


--
-- Name: nota_credito cod_nota_credito; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_credito ALTER COLUMN cod_nota_credito SET DEFAULT nextval('public.nota_credito_cod_nota_credito_seq'::regclass);


--
-- Name: notificaciones_super_admin cod_notificacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones_super_admin ALTER COLUMN cod_notificacion SET DEFAULT nextval('public.notificaciones_super_admin_cod_notificacion_seq'::regclass);


--
-- Name: orden_compra cod_orden_compra; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra ALTER COLUMN cod_orden_compra SET DEFAULT nextval('public.orden_compra_cod_orden_compra_seq'::regclass);


--
-- Name: orden_reparacion cod_orden_reparacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_reparacion ALTER COLUMN cod_orden_reparacion SET DEFAULT nextval('public.orden_reparacion_cod_orden_reparacion_seq'::regclass);


--
-- Name: pago cod_pago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago ALTER COLUMN cod_pago SET DEFAULT nextval('public.pago_cod_pago_seq'::regclass);


--
-- Name: pagos cod_pagos; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN cod_pagos SET DEFAULT nextval('public.pagos_cod_pagos_seq'::regclass);


--
-- Name: permisos cod_permiso; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos ALTER COLUMN cod_permiso SET DEFAULT nextval('public.permisos_cod_permiso_seq'::regclass);


--
-- Name: personas id_persona; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas ALTER COLUMN id_persona SET DEFAULT nextval('public.personas_id_persona_seq'::regclass);


--
-- Name: producto cod_producto; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto ALTER COLUMN cod_producto SET DEFAULT nextval('public.producto_cod_producto_seq'::regclass);


--
-- Name: producto_proveedor cod_producto_proveedor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedor ALTER COLUMN cod_producto_proveedor SET DEFAULT nextval('public.producto_proveedor_cod_producto_proveedor_seq'::regclass);


--
-- Name: proveedor cod_proveedor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor ALTER COLUMN cod_proveedor SET DEFAULT nextval('public.proveedor_cod_proveedor_seq'::regclass);


--
-- Name: recepcion cod_recepcion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion ALTER COLUMN cod_recepcion SET DEFAULT nextval('public.recepcion_cod_recepcion_seq'::regclass);


--
-- Name: reserva_inventario cod_reserva_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario ALTER COLUMN cod_reserva_inventario SET DEFAULT nextval('public.reserva_inventario_cod_reserva_inventario_seq'::regclass);


--
-- Name: roles cod_rol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN cod_rol SET DEFAULT nextval('public.roles_cod_rol_seq'::regclass);


--
-- Name: roles_permisos cod_rol_permiso; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos ALTER COLUMN cod_rol_permiso SET DEFAULT nextval('public.roles_permisos_cod_rol_permiso_seq'::regclass);


--
-- Name: servicios cod_servicio; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios ALTER COLUMN cod_servicio SET DEFAULT nextval('public.servicios_cod_servicio_seq'::regclass);


--
-- Name: transferencia_inventario cod_transferencia_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario ALTER COLUMN cod_transferencia_inventario SET DEFAULT nextval('public.transferencia_inventario_cod_transferencia_inventario_seq'::regclass);


--
-- Name: ubicacion cod_ubicacion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion ALTER COLUMN cod_ubicacion SET DEFAULT nextval('public.ubicacion_cod_ubicacion_seq'::regclass);


--
-- Name: usuarios cod_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN cod_usuario SET DEFAULT nextval('public.usuarios_cod_usuario_seq'::regclass);


--
-- Name: baja_inventario baja_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT baja_inventario_pkey PRIMARY KEY (cod_baja_inventario);


--
-- Name: bitacora_anulacion bitacora_anulacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_anulacion
    ADD CONSTRAINT bitacora_anulacion_pkey PRIMARY KEY (cod_bitacora);


--
-- Name: bitacora_excepcion_stock bitacora_excepcion_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_excepcion_stock
    ADD CONSTRAINT bitacora_excepcion_stock_pkey PRIMARY KEY (cod_excepcion);


--
-- Name: bitacora_facturacion bitacora_facturacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_facturacion
    ADD CONSTRAINT bitacora_facturacion_pkey PRIMARY KEY (cod_bitacora);


--
-- Name: carrusel_imagenes carrusel_imagenes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carrusel_imagenes
    ADD CONSTRAINT carrusel_imagenes_pkey PRIMARY KEY (cod_imagen);


--
-- Name: cat_estado_dev cat_estado_dev_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_dev
    ADD CONSTRAINT cat_estado_dev_pkey PRIMARY KEY (cod_cat_estado_dev);


--
-- Name: cat_estado_entrega cat_estado_entrega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_entrega
    ADD CONSTRAINT cat_estado_entrega_pkey PRIMARY KEY (cod_cat_est_entrega);


--
-- Name: cat_estado_orden_compra cat_estado_orden_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_orden_compra
    ADD CONSTRAINT cat_estado_orden_compra_pkey PRIMARY KEY (cod_estado_oc);


--
-- Name: cat_estado_reparacion cat_estado_reparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_estado_reparacion
    ADD CONSTRAINT cat_estado_reparacion_pkey PRIMARY KEY (cod_cat_est_rep);


--
-- Name: cat_metodo_pago cat_metodo_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cat_metodo_pago
    ADD CONSTRAINT cat_metodo_pago_pkey PRIMARY KEY (cod_cat_metodo_pago);


--
-- Name: catalogo_isv catalogo_isv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalogo_isv
    ADD CONSTRAINT catalogo_isv_pkey PRIMARY KEY (cod_isv);


--
-- Name: categoria_producto categoria_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categoria_producto
    ADD CONSTRAINT categoria_producto_pkey PRIMARY KEY (cod_categoria);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (cod_cliente);


--
-- Name: conteo_inventario_detalle conteo_inventario_detalle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT conteo_inventario_detalle_pkey PRIMARY KEY (cod_conteo_detalle);


--
-- Name: conteo_inventario conteo_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario
    ADD CONSTRAINT conteo_inventario_pkey PRIMARY KEY (cod_conteo_inventario);


--
-- Name: control_calidad control_calidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_calidad
    ADD CONSTRAINT control_calidad_pkey PRIMARY KEY (cod_control_calidad);


--
-- Name: cotizacion cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (cod_cotizacion);


--
-- Name: detalle_cotizacion detalle_cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_pkey PRIMARY KEY (cod_detalle_cotizacion);


--
-- Name: detalle_dev_cliente detalle_dev_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_dev_cliente
    ADD CONSTRAINT detalle_dev_cliente_pkey PRIMARY KEY (cod_detalle_dev_cliente);


--
-- Name: detalle_factura detalle_factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT detalle_factura_pkey PRIMARY KEY (cod_detalle_factura);


--
-- Name: detalle_nota_credito detalle_nota_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_nota_credito
    ADD CONSTRAINT detalle_nota_credito_pkey PRIMARY KEY (cod_detalle_nc);


--
-- Name: detalles_control_calidad detalles_control_calidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_control_calidad
    ADD CONSTRAINT detalles_control_calidad_pkey PRIMARY KEY (cod_detalle_cc);


--
-- Name: detalles_devoluciones_proveedor detalles_devoluciones_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_devoluciones_proveedor
    ADD CONSTRAINT detalles_devoluciones_proveedor_pkey PRIMARY KEY (cod_detalles_dev_prov);


--
-- Name: detalles_orden_compra detalles_orden_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT detalles_orden_compra_pkey PRIMARY KEY (cod_detalle_oc);


--
-- Name: detalles_recepcion detalles_recepcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT detalles_recepcion_pkey PRIMARY KEY (cod_detalles_recepcion);


--
-- Name: dev_cliente dev_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cliente
    ADD CONSTRAINT dev_cliente_pkey PRIMARY KEY (cod_dev_cliente);


--
-- Name: devoluciones_proveedor devoluciones_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT devoluciones_proveedor_pkey PRIMARY KEY (cod_devo_prov);


--
-- Name: empresa_config empresa_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empresa_config
    ADD CONSTRAINT empresa_config_pkey PRIMARY KEY (cod_config);


--
-- Name: entrega entrega_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entrega
    ADD CONSTRAINT entrega_pkey PRIMARY KEY (cod_entrega);


--
-- Name: equipo_cliente equipo_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_cliente
    ADD CONSTRAINT equipo_cliente_pkey PRIMARY KEY (cod_equipo);


--
-- Name: estado_orden_compra estado_orden_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden_compra
    ADD CONSTRAINT estado_orden_compra_pkey PRIMARY KEY (cod_est_orden_compra);


--
-- Name: estado_reparacion estado_reparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_reparacion
    ADD CONSTRAINT estado_reparacion_pkey PRIMARY KEY (cod_estado_reparacion);


--
-- Name: factura factura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT factura_pkey PRIMARY KEY (cod_factura);


--
-- Name: grupo_cliente grupo_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_cliente
    ADD CONSTRAINT grupo_cliente_pkey PRIMARY KEY (cod_grupo);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (cod_inventario);


--
-- Name: movimiento_inventario movimiento_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT movimiento_inventario_pkey PRIMARY KEY (cod_mov_inv);


--
-- Name: nota_credito nota_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_credito
    ADD CONSTRAINT nota_credito_pkey PRIMARY KEY (cod_nota_credito);


--
-- Name: notificaciones_super_admin_leidas notificaciones_super_admin_leidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones_super_admin_leidas
    ADD CONSTRAINT notificaciones_super_admin_leidas_pkey PRIMARY KEY (cod_notificacion, cod_usuario);


--
-- Name: notificaciones_super_admin notificaciones_super_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones_super_admin
    ADD CONSTRAINT notificaciones_super_admin_pkey PRIMARY KEY (cod_notificacion);


--
-- Name: orden_compra orden_compra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra
    ADD CONSTRAINT orden_compra_pkey PRIMARY KEY (cod_orden_compra);


--
-- Name: orden_reparacion orden_reparacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_reparacion
    ADD CONSTRAINT orden_reparacion_pkey PRIMARY KEY (cod_orden_reparacion);


--
-- Name: pago pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_pkey PRIMARY KEY (cod_pago);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (cod_pagos);


--
-- Name: permisos permisos_nombre_permiso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_nombre_permiso_key UNIQUE (nombre_permiso);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (cod_permiso);


--
-- Name: personas personas_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_correo_key UNIQUE (correo);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id_persona);


--
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (cod_producto);


--
-- Name: producto_proveedor producto_proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedor
    ADD CONSTRAINT producto_proveedor_pkey PRIMARY KEY (cod_producto_proveedor);


--
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (cod_proveedor);


--
-- Name: recepcion recepcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion
    ADD CONSTRAINT recepcion_pkey PRIMARY KEY (cod_recepcion);


--
-- Name: reserva_inventario reserva_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT reserva_inventario_pkey PRIMARY KEY (cod_reserva_inventario);


--
-- Name: roles roles_nombre_rol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_rol_key UNIQUE (nombre_rol);


--
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (cod_rol_permiso);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (cod_rol);


--
-- Name: servicios servicios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicios
    ADD CONSTRAINT servicios_pkey PRIMARY KEY (cod_servicio);


--
-- Name: transferencia_inventario transferencia_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT transferencia_inventario_pkey PRIMARY KEY (cod_transferencia_inventario);


--
-- Name: ubicacion ubicacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion
    ADD CONSTRAINT ubicacion_pkey PRIMARY KEY (cod_ubicacion);


--
-- Name: conteo_inventario_detalle uq_conteo_detalle; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT uq_conteo_detalle UNIQUE (cod_conteo_inventario, cod_producto, cod_ubicacion);


--
-- Name: inventario uq_inv_prod_ubi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT uq_inv_prod_ubi UNIQUE (cod_producto, cod_ubicacion);


--
-- Name: producto_proveedor uq_prod_prov; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedor
    ADD CONSTRAINT uq_prod_prov UNIQUE (cod_producto, cod_proveedor);


--
-- Name: roles_permisos uq_rol_perm; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT uq_rol_perm UNIQUE (cod_rol, cod_permiso);


--
-- Name: usuarios usuarios_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (cod_usuario);


--
-- Name: usuarios_rol usuarios_rol_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_rol
    ADD CONSTRAINT usuarios_rol_pkey PRIMARY KEY (cod_usuario);


--
-- Name: idx_baja_inventario_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baja_inventario_estado_fecha ON public.baja_inventario USING btree (estado, fecha DESC);


--
-- Name: idx_baja_inventario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baja_inventario_fecha ON public.baja_inventario USING btree (fecha DESC);


--
-- Name: idx_baja_inventario_mov_baja_unq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_baja_inventario_mov_baja_unq ON public.baja_inventario USING btree (cod_movimiento_baja) WHERE (cod_movimiento_baja IS NOT NULL);


--
-- Name: idx_baja_inventario_producto_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baja_inventario_producto_ubicacion ON public.baja_inventario USING btree (cod_producto, cod_ubicacion);


--
-- Name: idx_baja_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baja_producto ON public.baja_inventario USING btree (cod_producto);


--
-- Name: idx_baja_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baja_usuario ON public.baja_inventario USING btree (cod_usuario);


--
-- Name: idx_bitexc_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitexc_factura ON public.bitacora_excepcion_stock USING btree (cod_factura);


--
-- Name: idx_bitexc_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitexc_producto ON public.bitacora_excepcion_stock USING btree (cod_producto);


--
-- Name: idx_bitexc_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitexc_usuario ON public.bitacora_excepcion_stock USING btree (cod_usuario);


--
-- Name: idx_bitfac_entidad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitfac_entidad ON public.bitacora_facturacion USING btree (entidad);


--
-- Name: idx_bitfac_evento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitfac_evento ON public.bitacora_facturacion USING btree (evento);


--
-- Name: idx_bitfac_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitfac_factura ON public.bitacora_facturacion USING btree (cod_factura);


--
-- Name: idx_bitfac_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitfac_fecha ON public.bitacora_facturacion USING btree (fecha DESC);


--
-- Name: idx_bitfac_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitfac_usuario ON public.bitacora_facturacion USING btree (cod_usuario);


--
-- Name: idx_cc_rec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cc_rec ON public.control_calidad USING btree (cod_recepcion);


--
-- Name: idx_clientes_dni; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_dni ON public.clientes USING btree (dni);


--
-- Name: idx_conteo_det_conteo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_det_conteo ON public.conteo_inventario_detalle USING btree (cod_conteo_inventario);


--
-- Name: idx_conteo_det_conteo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_det_conteo_fecha ON public.conteo_inventario_detalle USING btree (cod_conteo_inventario, fecha_registro DESC);


--
-- Name: idx_conteo_det_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_det_inventario ON public.conteo_inventario_detalle USING btree (cod_inventario);


--
-- Name: idx_conteo_det_producto_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_det_producto_ubicacion ON public.conteo_inventario_detalle USING btree (cod_producto, cod_ubicacion);


--
-- Name: idx_conteo_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_estado_fecha ON public.conteo_inventario USING btree (estado, fecha_apertura DESC);


--
-- Name: idx_conteo_fecha_cierre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_fecha_cierre ON public.conteo_inventario USING btree (fecha_cierre DESC);


--
-- Name: idx_conteo_usuario_apertura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_usuario_apertura ON public.conteo_inventario USING btree (cod_usuario_apertura);


--
-- Name: idx_conteo_usuario_cierre; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conteo_usuario_cierre ON public.conteo_inventario USING btree (cod_usuario_cierre);


--
-- Name: idx_cotizacion_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_cliente ON public.cotizacion USING btree (cod_cliente);


--
-- Name: idx_cotizacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_estado ON public.cotizacion USING btree (estado_cotizacion);


--
-- Name: idx_dcc_cc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dcc_cc ON public.detalles_control_calidad USING btree (cod_control_calidad);


--
-- Name: idx_dcc_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dcc_prod ON public.detalles_control_calidad USING btree (cod_producto);


--
-- Name: idx_ddp_dev; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddp_dev ON public.detalles_devoluciones_proveedor USING btree (cod_devoluciones);


--
-- Name: idx_ddp_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddp_prod ON public.detalles_devoluciones_proveedor USING btree (cod_producto);


--
-- Name: idx_det_cotizacion_cot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_det_cotizacion_cot ON public.detalle_cotizacion USING btree (cod_cotizacion);


--
-- Name: idx_detalle_dev_cliente_dev; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_dev_cliente_dev ON public.detalle_dev_cliente USING btree (cod_dev_cliente);


--
-- Name: idx_detalle_dev_cliente_df; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_dev_cliente_df ON public.detalle_dev_cliente USING btree (cod_detalle_factura);


--
-- Name: idx_detalle_factura_cod_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_factura_cod_factura ON public.detalle_factura USING btree (cod_factura);


--
-- Name: idx_detalle_factura_cod_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_factura_cod_producto ON public.detalle_factura USING btree (cod_producto);


--
-- Name: idx_detalle_factura_cod_servicio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalle_factura_cod_servicio ON public.detalle_factura USING btree (cod_servicio);


--
-- Name: idx_dev_cliente_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_cliente_estado ON public.dev_cliente USING btree (cod_estado_devolucion);


--
-- Name: idx_dev_cliente_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dev_cliente_factura ON public.dev_cliente USING btree (cod_factura);


--
-- Name: idx_dnc_detfac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dnc_detfac ON public.detalle_nota_credito USING btree (cod_detalle_factura);


--
-- Name: idx_dnc_nota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dnc_nota ON public.detalle_nota_credito USING btree (cod_nota_credito);


--
-- Name: idx_dnc_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dnc_prod ON public.detalle_nota_credito USING btree (cod_producto);


--
-- Name: idx_doc_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_oc ON public.detalles_orden_compra USING btree (cod_orden_compra);


--
-- Name: idx_doc_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_prod ON public.detalles_orden_compra USING btree (cod_producto);


--
-- Name: idx_dp_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dp_estado ON public.devoluciones_proveedor USING btree (cod_estado_devolucion);


--
-- Name: idx_dp_prov; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dp_prov ON public.devoluciones_proveedor USING btree (cod_proveedor);


--
-- Name: idx_dp_rec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dp_rec ON public.devoluciones_proveedor USING btree (cod_recepcion);


--
-- Name: idx_drec_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drec_prod ON public.detalles_recepcion USING btree (cod_producto);


--
-- Name: idx_drec_rec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drec_rec ON public.detalles_recepcion USING btree (cod_recepcion);


--
-- Name: idx_ec_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ec_cliente ON public.equipo_cliente USING btree (cod_cliente);


--
-- Name: idx_entrega_cod_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entrega_cod_factura ON public.entrega USING btree (cod_factura);


--
-- Name: idx_entrega_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entrega_estado ON public.entrega USING btree (cod_estado_entrega);


--
-- Name: idx_entrega_repartidor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entrega_repartidor ON public.entrega USING btree (usuario_repartidor);


--
-- Name: idx_eoc_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eoc_estado ON public.estado_orden_compra USING btree (cod_estado_oc);


--
-- Name: idx_eoc_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eoc_oc ON public.estado_orden_compra USING btree (cod_orden_compra);


--
-- Name: idx_er_orden; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_er_orden ON public.estado_reparacion USING btree (cod_orden_reparacion);


--
-- Name: idx_factura_cod_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_cod_cliente ON public.factura USING btree (cod_cliente);


--
-- Name: idx_factura_cod_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_cod_usuario ON public.factura USING btree (cod_usuario);


--
-- Name: idx_factura_metodo_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_factura_metodo_pago ON public.factura USING btree (metodo_pago);


--
-- Name: idx_gc_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gc_cliente ON public.grupo_cliente USING btree (cod_cliente);


--
-- Name: idx_inventario_cod_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_cod_producto ON public.inventario USING btree (cod_producto);


--
-- Name: idx_inventario_cod_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_cod_ubicacion ON public.inventario USING btree (cod_ubicacion);


--
-- Name: idx_inventario_fecha_ult_mov; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_fecha_ult_mov ON public.inventario USING btree (fecha_ult_mov DESC);


--
-- Name: idx_mov_inv_cod_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mov_inv_cod_inventario ON public.movimiento_inventario USING btree (cod_inventario);


--
-- Name: idx_mov_inv_cod_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mov_inv_cod_usuario ON public.movimiento_inventario USING btree (cod_usuario);


--
-- Name: idx_mov_inv_ref_tipo_ref_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mov_inv_ref_tipo_ref_id ON public.movimiento_inventario USING btree (ref_tipo, ref_id);


--
-- Name: idx_mov_inv_referencia_documento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mov_inv_referencia_documento ON public.movimiento_inventario USING btree (referencia_documento);


--
-- Name: idx_mov_inv_tipo_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mov_inv_tipo_fecha ON public.movimiento_inventario USING btree (tipo, fecha DESC);


--
-- Name: idx_nc_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_estado ON public.nota_credito USING btree (estado);


--
-- Name: idx_nc_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_factura ON public.nota_credito USING btree (cod_factura);


--
-- Name: idx_nc_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_fecha ON public.nota_credito USING btree (fecha DESC);


--
-- Name: idx_nc_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nc_usuario ON public.nota_credito USING btree (cod_usuario);


--
-- Name: idx_oc_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oc_estado ON public.orden_compra USING btree (cod_estado_oc);


--
-- Name: idx_oc_prov; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oc_prov ON public.orden_compra USING btree (cod_proveedor);


--
-- Name: idx_oc_usr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oc_usr ON public.orden_compra USING btree (cod_usuario);


--
-- Name: idx_or_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_or_cliente ON public.orden_reparacion USING btree (cod_cliente);


--
-- Name: idx_or_equipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_or_equipo ON public.orden_reparacion USING btree (cod_equipo);


--
-- Name: idx_or_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_or_estado ON public.orden_reparacion USING btree (cod_estado_reparacion);


--
-- Name: idx_pago_cod_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pago_cod_factura ON public.pago USING btree (cod_factura);


--
-- Name: idx_pagos_cod_factura; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_cod_factura ON public.pagos USING btree (cod_factura);


--
-- Name: idx_pagos_metodo_pago; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_metodo_pago ON public.pagos USING btree (metodo_pago);


--
-- Name: idx_pp_prod; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pp_prod ON public.producto_proveedor USING btree (cod_producto);


--
-- Name: idx_pp_prov; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pp_prov ON public.producto_proveedor USING btree (cod_proveedor);


--
-- Name: idx_producto_cod_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_producto_cod_categoria ON public.producto USING btree (cod_categoria);


--
-- Name: idx_proveedor_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proveedor_estado ON public.proveedor USING btree (estado_proveedor);


--
-- Name: idx_rec_oc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rec_oc ON public.recepcion USING btree (cod_orden_compra);


--
-- Name: idx_rec_usr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rec_usr ON public.recepcion USING btree (cod_usuario);


--
-- Name: idx_reserva_activa_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_activa_inventario ON public.reserva_inventario USING btree (cod_inventario) WHERE ((estado)::text = 'ACTIVA'::text);


--
-- Name: idx_reserva_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_estado_fecha ON public.reserva_inventario USING btree (estado, fecha_creacion DESC);


--
-- Name: idx_reserva_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_inventario ON public.reserva_inventario USING btree (cod_inventario);


--
-- Name: idx_reserva_producto_ubicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_producto_ubicacion ON public.reserva_inventario USING btree (cod_producto, cod_ubicacion);


--
-- Name: idx_reserva_referencia; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_referencia ON public.reserva_inventario USING btree (referencia);


--
-- Name: idx_reserva_usuario_creacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reserva_usuario_creacion ON public.reserva_inventario USING btree (cod_usuario_creacion);


--
-- Name: idx_rp_permiso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rp_permiso ON public.roles_permisos USING btree (cod_permiso);


--
-- Name: idx_rp_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rp_rol ON public.roles_permisos USING btree (cod_rol);


--
-- Name: idx_transferencia_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_estado ON public.transferencia_inventario USING btree (estado);


--
-- Name: idx_transferencia_estado_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_estado_fecha ON public.transferencia_inventario USING btree (estado, fecha DESC);


--
-- Name: idx_transferencia_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_fecha ON public.transferencia_inventario USING btree (fecha DESC);


--
-- Name: idx_transferencia_fecha_anulacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_fecha_anulacion ON public.transferencia_inventario USING btree (fecha_anulacion DESC);


--
-- Name: idx_transferencia_origen_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_origen_destino ON public.transferencia_inventario USING btree (cod_ubicacion_origen, cod_ubicacion_destino);


--
-- Name: idx_transferencia_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_producto ON public.transferencia_inventario USING btree (cod_producto);


--
-- Name: idx_transferencia_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_ref ON public.transferencia_inventario USING btree (referencia);


--
-- Name: idx_transferencia_usuario_anulacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transferencia_usuario_anulacion ON public.transferencia_inventario USING btree (cod_usuario_anulacion);


--
-- Name: idx_ubicacion_cod_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_cod_producto ON public.ubicacion USING btree (cod_producto);


--
-- Name: idx_ubicacion_codigo_producto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ubicacion_codigo_producto ON public.ubicacion USING btree (codigo_producto);


--
-- Name: idx_ur_rol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ur_rol ON public.usuarios_rol USING btree (cod_rol);


--
-- Name: idx_usuarios_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_estado ON public.usuarios USING btree (estado_usuario);


--
-- Name: uq_cat_estado_dev_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cat_estado_dev_nombre ON public.cat_estado_dev USING btree (lower((nombre)::text));


--
-- Name: uq_cat_estado_entrega_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cat_estado_entrega_nombre ON public.cat_estado_entrega USING btree (lower((nombre)::text));


--
-- Name: uq_cat_estado_oc_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cat_estado_oc_nombre ON public.cat_estado_orden_compra USING btree (lower((nombre)::text));


--
-- Name: uq_cat_estado_rep_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cat_estado_rep_nombre ON public.cat_estado_reparacion USING btree (lower((nombre)::text));


--
-- Name: uq_cat_metodo_pago_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cat_metodo_pago_nombre ON public.cat_metodo_pago USING btree (lower((nombre)::text));


--
-- Name: uq_categoria_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_categoria_nombre ON public.categoria_producto USING btree (lower((nombre_categoria)::text));


--
-- Name: uq_producto_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_producto_nombre ON public.producto USING btree (lower((nombre_producto)::text));


--
-- Name: uq_servicios_nombre; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_servicios_nombre ON public.servicios USING btree (lower((nombre_servicios)::text));


--
-- Name: bitacora_anulacion bitacora_anulacion_cod_factura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_anulacion
    ADD CONSTRAINT bitacora_anulacion_cod_factura_fkey FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura);


--
-- Name: bitacora_anulacion bitacora_anulacion_cod_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_anulacion
    ADD CONSTRAINT bitacora_anulacion_cod_usuario_fkey FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario);


--
-- Name: cotizacion cotizacion_cod_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_cod_cliente_fkey FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente);


--
-- Name: cotizacion cotizacion_cod_factura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_cod_factura_fkey FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura);


--
-- Name: cotizacion cotizacion_cod_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_cod_usuario_fkey FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario);


--
-- Name: detalle_cotizacion detalle_cotizacion_cod_cotizacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_cod_cotizacion_fkey FOREIGN KEY (cod_cotizacion) REFERENCES public.cotizacion(cod_cotizacion) ON DELETE CASCADE;


--
-- Name: detalle_cotizacion detalle_cotizacion_cod_producto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_cotizacion
    ADD CONSTRAINT detalle_cotizacion_cod_producto_fkey FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto);


--
-- Name: detalle_nota_credito detalle_nota_credito_cod_detalle_factura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_nota_credito
    ADD CONSTRAINT detalle_nota_credito_cod_detalle_factura_fkey FOREIGN KEY (cod_detalle_factura) REFERENCES public.detalle_factura(cod_detalle_factura);


--
-- Name: detalle_nota_credito detalle_nota_credito_cod_nota_credito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_nota_credito
    ADD CONSTRAINT detalle_nota_credito_cod_nota_credito_fkey FOREIGN KEY (cod_nota_credito) REFERENCES public.nota_credito(cod_nota_credito);


--
-- Name: factura factura_anulada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT factura_anulada_por_fkey FOREIGN KEY (anulada_por) REFERENCES public.usuarios(cod_usuario);


--
-- Name: baja_inventario fk_baja_inventario_mov_anulacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_mov_anulacion FOREIGN KEY (cod_movimiento_anulacion) REFERENCES public.movimiento_inventario(cod_mov_inv) ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;


--
-- Name: baja_inventario fk_baja_inventario_mov_baja; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_mov_baja FOREIGN KEY (cod_movimiento_baja) REFERENCES public.movimiento_inventario(cod_mov_inv) ON UPDATE CASCADE ON DELETE SET NULL NOT VALID;


--
-- Name: baja_inventario fk_baja_inventario_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_producto FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: baja_inventario fk_baja_inventario_ubicacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_ubicacion FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: baja_inventario fk_baja_inventario_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_usuario FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: baja_inventario fk_baja_inventario_usuario_anulacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_inventario_usuario_anulacion FOREIGN KEY (cod_usuario_anulacion) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: baja_inventario fk_baja_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: baja_inventario fk_baja_ubi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_ubi FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: baja_inventario fk_baja_usr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja_inventario
    ADD CONSTRAINT fk_baja_usr FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: control_calidad fk_cc_rec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_calidad
    ADD CONSTRAINT fk_cc_rec FOREIGN KEY (cod_recepcion) REFERENCES public.recepcion(cod_recepcion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: control_calidad fk_cc_usr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.control_calidad
    ADD CONSTRAINT fk_cc_usr FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conteo_inventario_detalle fk_conteo_det_conteo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT fk_conteo_det_conteo FOREIGN KEY (cod_conteo_inventario) REFERENCES public.conteo_inventario(cod_conteo_inventario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conteo_inventario_detalle fk_conteo_det_inventario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT fk_conteo_det_inventario FOREIGN KEY (cod_inventario) REFERENCES public.inventario(cod_inventario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conteo_inventario_detalle fk_conteo_det_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT fk_conteo_det_producto FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conteo_inventario_detalle fk_conteo_det_ubicacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario_detalle
    ADD CONSTRAINT fk_conteo_det_ubicacion FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: conteo_inventario fk_conteo_usuario_apertura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario
    ADD CONSTRAINT fk_conteo_usuario_apertura FOREIGN KEY (cod_usuario_apertura) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conteo_inventario fk_conteo_usuario_cierre; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conteo_inventario
    ADD CONSTRAINT fk_conteo_usuario_cierre FOREIGN KEY (cod_usuario_cierre) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: dev_cliente fk_dc_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cliente
    ADD CONSTRAINT fk_dc_estado FOREIGN KEY (cod_estado_devolucion) REFERENCES public.cat_estado_dev(cod_cat_estado_dev) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dev_cliente fk_dc_fact; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dev_cliente
    ADD CONSTRAINT fk_dc_fact FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_control_calidad fk_dcc_cc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_control_calidad
    ADD CONSTRAINT fk_dcc_cc FOREIGN KEY (cod_control_calidad) REFERENCES public.control_calidad(cod_control_calidad) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalles_control_calidad fk_dcc_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_control_calidad
    ADD CONSTRAINT fk_dcc_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_dev_cliente fk_ddc_dev; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_dev_cliente
    ADD CONSTRAINT fk_ddc_dev FOREIGN KEY (cod_dev_cliente) REFERENCES public.dev_cliente(cod_dev_cliente) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_dev_cliente fk_ddc_df; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_dev_cliente
    ADD CONSTRAINT fk_ddc_df FOREIGN KEY (cod_detalle_factura) REFERENCES public.detalle_factura(cod_detalle_factura) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_devoluciones_proveedor fk_ddp_dev; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_devoluciones_proveedor
    ADD CONSTRAINT fk_ddp_dev FOREIGN KEY (cod_devoluciones) REFERENCES public.devoluciones_proveedor(cod_devo_prov) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalles_devoluciones_proveedor fk_ddp_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_devoluciones_proveedor
    ADD CONSTRAINT fk_ddp_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_factura fk_df_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT fk_df_factura FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_factura fk_df_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT fk_df_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_factura fk_df_serv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalle_factura
    ADD CONSTRAINT fk_df_serv FOREIGN KEY (cod_servicio) REFERENCES public.servicios(cod_servicio) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_orden_compra fk_doc_oc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT fk_doc_oc FOREIGN KEY (cod_orden_compra) REFERENCES public.orden_compra(cod_orden_compra) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalles_orden_compra fk_doc_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_orden_compra
    ADD CONSTRAINT fk_doc_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devoluciones_proveedor fk_dp_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT fk_dp_estado FOREIGN KEY (cod_estado_devolucion) REFERENCES public.cat_estado_dev(cod_cat_estado_dev) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devoluciones_proveedor fk_dp_prov; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT fk_dp_prov FOREIGN KEY (cod_proveedor) REFERENCES public.proveedor(cod_proveedor) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: devoluciones_proveedor fk_dp_rec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.devoluciones_proveedor
    ADD CONSTRAINT fk_dp_rec FOREIGN KEY (cod_recepcion) REFERENCES public.recepcion(cod_recepcion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_recepcion fk_drec_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT fk_drec_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalles_recepcion fk_drec_rec; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_recepcion
    ADD CONSTRAINT fk_drec_rec FOREIGN KEY (cod_recepcion) REFERENCES public.recepcion(cod_recepcion) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: equipo_cliente fk_ec_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipo_cliente
    ADD CONSTRAINT fk_ec_cliente FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entrega fk_ent_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entrega
    ADD CONSTRAINT fk_ent_estado FOREIGN KEY (cod_estado_entrega) REFERENCES public.cat_estado_entrega(cod_cat_est_entrega) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: entrega fk_ent_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entrega
    ADD CONSTRAINT fk_ent_factura FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: entrega fk_ent_rep; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entrega
    ADD CONSTRAINT fk_ent_rep FOREIGN KEY (usuario_repartidor) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: estado_orden_compra fk_eoc_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden_compra
    ADD CONSTRAINT fk_eoc_estado FOREIGN KEY (cod_estado_oc) REFERENCES public.cat_estado_orden_compra(cod_estado_oc) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: estado_orden_compra fk_eoc_oc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_orden_compra
    ADD CONSTRAINT fk_eoc_oc FOREIGN KEY (cod_orden_compra) REFERENCES public.orden_compra(cod_orden_compra) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: estado_reparacion fk_er_cat; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_reparacion
    ADD CONSTRAINT fk_er_cat FOREIGN KEY (cod_estado_reparacion_cat) REFERENCES public.cat_estado_reparacion(cod_cat_est_rep) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: estado_reparacion fk_er_orden; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estado_reparacion
    ADD CONSTRAINT fk_er_orden FOREIGN KEY (cod_orden_reparacion) REFERENCES public.orden_reparacion(cod_orden_reparacion) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: factura fk_fac_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_fac_cliente FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: factura fk_fac_metodo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_fac_metodo FOREIGN KEY (metodo_pago) REFERENCES public.cat_metodo_pago(cod_cat_metodo_pago) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: factura fk_fac_usr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.factura
    ADD CONSTRAINT fk_fac_usr FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: grupo_cliente fk_gc_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_cliente
    ADD CONSTRAINT fk_gc_cliente FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: inventario fk_inv_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inv_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventario fk_inv_ubi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT fk_inv_ubi FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: movimiento_inventario fk_mov_inv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_mov_inv FOREIGN KEY (cod_inventario) REFERENCES public.inventario(cod_inventario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: movimiento_inventario fk_mov_inv_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimiento_inventario
    ADD CONSTRAINT fk_mov_inv_usuario FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: orden_compra fk_oc_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra
    ADD CONSTRAINT fk_oc_estado FOREIGN KEY (cod_estado_oc) REFERENCES public.cat_estado_orden_compra(cod_estado_oc) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orden_compra fk_oc_prov; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra
    ADD CONSTRAINT fk_oc_prov FOREIGN KEY (cod_proveedor) REFERENCES public.proveedor(cod_proveedor) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orden_compra fk_oc_usr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_compra
    ADD CONSTRAINT fk_oc_usr FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orden_reparacion fk_or_cliente; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_reparacion
    ADD CONSTRAINT fk_or_cliente FOREIGN KEY (cod_cliente) REFERENCES public.clientes(cod_cliente) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orden_reparacion fk_or_equipo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_reparacion
    ADD CONSTRAINT fk_or_equipo FOREIGN KEY (cod_equipo) REFERENCES public.equipo_cliente(cod_equipo) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: orden_reparacion fk_or_estado; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orden_reparacion
    ADD CONSTRAINT fk_or_estado FOREIGN KEY (cod_estado_reparacion) REFERENCES public.cat_estado_reparacion(cod_cat_est_rep) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pagos fk_pag_factura; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT fk_pag_factura FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pagos fk_pag_metodo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT fk_pag_metodo FOREIGN KEY (metodo_pago) REFERENCES public.cat_metodo_pago(cod_cat_metodo_pago) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto_proveedor fk_pp_prod; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedor
    ADD CONSTRAINT fk_pp_prod FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: producto_proveedor fk_pp_prov; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto_proveedor
    ADD CONSTRAINT fk_pp_prov FOREIGN KEY (cod_proveedor) REFERENCES public.proveedor(cod_proveedor) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: producto fk_prod_categoria; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT fk_prod_categoria FOREIGN KEY (cod_categoria) REFERENCES public.categoria_producto(cod_categoria) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto fk_producto_isv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT fk_producto_isv FOREIGN KEY (cod_isv) REFERENCES public.catalogo_isv(cod_isv);


--
-- Name: recepcion fk_rec_oc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion
    ADD CONSTRAINT fk_rec_oc FOREIGN KEY (cod_orden_compra) REFERENCES public.orden_compra(cod_orden_compra) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: recepcion fk_rec_usr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion
    ADD CONSTRAINT fk_rec_usr FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reserva_inventario fk_reserva_inv_inventario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_inventario FOREIGN KEY (cod_inventario) REFERENCES public.inventario(cod_inventario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reserva_inventario fk_reserva_inv_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_producto FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reserva_inventario fk_reserva_inv_ubicacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_ubicacion FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reserva_inventario fk_reserva_inv_usuario_consume; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_usuario_consume FOREIGN KEY (cod_usuario_consumo) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reserva_inventario fk_reserva_inv_usuario_crea; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_usuario_crea FOREIGN KEY (cod_usuario_creacion) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reserva_inventario fk_reserva_inv_usuario_libera; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reserva_inventario
    ADD CONSTRAINT fk_reserva_inv_usuario_libera FOREIGN KEY (cod_usuario_liberacion) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: roles_permisos fk_rp_permiso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT fk_rp_permiso FOREIGN KEY (cod_permiso) REFERENCES public.permisos(cod_permiso) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles_permisos fk_rp_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT fk_rp_rol FOREIGN KEY (cod_rol) REFERENCES public.roles(cod_rol) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: transferencia_inventario fk_transferencia_inv_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_inv_destino FOREIGN KEY (cod_inventario_destino) REFERENCES public.inventario(cod_inventario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transferencia_inventario fk_transferencia_inv_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_inv_origen FOREIGN KEY (cod_inventario_origen) REFERENCES public.inventario(cod_inventario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transferencia_inventario fk_transferencia_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_producto FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transferencia_inventario fk_transferencia_ubicacion_destino; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_ubicacion_destino FOREIGN KEY (cod_ubicacion_destino) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transferencia_inventario fk_transferencia_ubicacion_origen; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_ubicacion_origen FOREIGN KEY (cod_ubicacion_origen) REFERENCES public.ubicacion(cod_ubicacion) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: transferencia_inventario fk_transferencia_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_usuario FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: transferencia_inventario fk_transferencia_usuario_anulacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencia_inventario
    ADD CONSTRAINT fk_transferencia_usuario_anulacion FOREIGN KEY (cod_usuario_anulacion) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ubicacion fk_ubicacion_cod_producto; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ubicacion
    ADD CONSTRAINT fk_ubicacion_cod_producto FOREIGN KEY (cod_producto) REFERENCES public.producto(cod_producto) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: usuarios_rol fk_ur_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_rol
    ADD CONSTRAINT fk_ur_rol FOREIGN KEY (cod_rol) REFERENCES public.roles(cod_rol) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usuarios_rol fk_ur_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios_rol
    ADD CONSTRAINT fk_ur_usuario FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: nota_credito nota_credito_cod_factura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_credito
    ADD CONSTRAINT nota_credito_cod_factura_fkey FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura);


--
-- Name: pago pago_cod_factura_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_cod_factura_fkey FOREIGN KEY (cod_factura) REFERENCES public.factura(cod_factura) ON DELETE CASCADE;


--
-- Name: pago pago_cod_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pago
    ADD CONSTRAINT pago_cod_usuario_fkey FOREIGN KEY (cod_usuario) REFERENCES public.usuarios(cod_usuario);


--
-- Name: producto producto_cod_ubicacion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.producto
    ADD CONSTRAINT producto_cod_ubicacion_fkey FOREIGN KEY (cod_ubicacion) REFERENCES public.ubicacion(cod_ubicacion);


--
-- PostgreSQL database dump complete
--

\unrestrict L3SarSahY1wYCpPwD4hYLxKl1jPauf8MK8CMBrhnRZyoBaLN4XSQDHy4122LwoT
