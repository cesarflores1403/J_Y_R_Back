--
-- PostgreSQL database dump
--

\restrict sO0j6joi3uSJWnSIB7nbSBNiWTShNgD59n4u9hmmlMapagIJCP3EHVs6x2Kx8wp

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

BEGIN;

-- Datos preservados para una instalacion nueva. No contiene informacion
-- operativa de facturas, clientes, productos, inventario ni proveedores.
TRUNCATE TABLE public.carrusel_imagenes,
  public.usuarios_rol,
  public.usuarios,
  public.empresa_config,
  public.roles
RESTART IDENTITY CASCADE;

--
-- Data for Name: carrusel_imagenes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (4, 'Hyundai', 'Repuestos Hyundai', '/uploads/carrusel-marca_hyundai.png', 2, true, '2026-02-27 19:07:10.185625');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (7, 'Suzuki', 'Repuestos Suzuki', '/uploads/carrusel-marca_suzuki.png', 5, true, '2026-02-27 19:07:10.669205');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (5, 'Nissan', 'Repuestos Nissan', '/uploads/carrusel-marca_nissan.png', 0, true, '2026-02-27 19:07:10.346592');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (3, 'Chevrolet', 'Repuestos Chevrolet', '/uploads/carrusel-marca_chevrolet.png', 1, true, '2026-02-27 19:07:10.030091');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (8, 'Mitsubishi', 'Repuestos Mitsubishi', '/uploads/carrusel-marca_mitsubishi.svg', 2, true, '2026-02-27 19:07:10.831529');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (2, 'Toyota', 'Repuestos Toyota', '/uploads/carrusel-marca_toyota.png', -2, true, '2026-02-27 19:07:09.855911');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (6, 'Honda', 'Repuestos Honda', '/uploads/carrusel-marca_honda.png', -3, true, '2026-02-27 19:07:10.506808');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (9, 'Ford', 'Repuestos Ford', '/uploads/carrusel-marca_ford.png', 6, true, '2026-08-11 14:10:35.795551');
INSERT INTO public.carrusel_imagenes (cod_imagen, titulo, descripcion, imagen_url, orden, activo, fecha_creacion) VALUES (10, 'Volkswagen', 'Repuestos Volkswagen', '/uploads/carrusel-marca_volkswagen.png', 7, true, '2026-08-11 14:13:08.782573');


--
-- Data for Name: empresa_config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.empresa_config (cod_config, nombre, rtn, direccion, telefono, correo, cai, rango_autorizado, fecha_limite_emision, propietaria, garantia, actualizado_en, logo_factura_url) VALUES (1, 'J&R Accesorios y Reparaciones', '08011992200700', 'Bo. Villa Adela, 14 y 15 calle, 6 avenida esquina opuesta Gasolinera Uno, Comayagüela.', '9483-1906 / 8865-7197', 'accesoriosjyr4@gmail.com', '4A03DF-5A587E-8106E0-63BE03-09097B-B1', '000-001-01-00000351 al 000-001-01-00000450', '2026-08-04', 'Prop. Ledy Lizzeth Chavarría', '2 MESES DE GARANTÍA POR FILTRACIÓN DE AGUA', '2026-08-11 14:35:12.659-06', NULL);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles (cod_rol, nombre_rol, descripcion, fecha_creacion) VALUES (1, 'Administrador', 'Rol de Administrador', '2026-08-11 13:46:41.480496');
INSERT INTO public.roles (cod_rol, nombre_rol, descripcion, fecha_creacion) VALUES (2, 'Cajero', 'Rol de Cajero', '2026-08-11 13:46:41.480496');
INSERT INTO public.roles (cod_rol, nombre_rol, descripcion, fecha_creacion) VALUES (3, 'Bodeguero', 'Rol de Bodeguero', '2026-08-11 13:46:41.480496');
INSERT INTO public.roles (cod_rol, nombre_rol, descripcion, fecha_creacion) VALUES (4, 'Super Administrador', 'Acceso total al sistema sin restricciones', '2026-08-11 13:46:41.480496');


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.usuarios (cod_usuario, nombre_usuario, contrasena, estado_usuario, creado_en, actualizado_en, token_recuperacion, expiracion_token) VALUES (4, 'bodeguero', '$2a$12$uC.cJGIPHypqY6fiNiktP.3ATl1ASVu7Uah/8PSLX88txlZZpuSXK', true, '2026-02-14 02:24:48.989813', '2026-03-18 23:57:59.947', NULL, NULL);
INSERT INTO public.usuarios (cod_usuario, nombre_usuario, contrasena, estado_usuario, creado_en, actualizado_en, token_recuperacion, expiracion_token) VALUES (3, 'cajero', '$2a$12$MEnQj8vcOQY4sMf8khA1HuZnJ2KdVwIc.sEi9gdrUUKsJzptnEW3S', true, '2026-02-14 02:24:48.336285', '2026-03-11 06:49:25.273', NULL, NULL);
INSERT INTO public.usuarios (cod_usuario, nombre_usuario, contrasena, estado_usuario, creado_en, actualizado_en, token_recuperacion, expiracion_token) VALUES (7, 'Mantenimiento', '$2a$12$kLAJdW1iZe9YSsmnoUYmF.PWQYzliT6S5fmqrLQgjGb6m8qhSOJ92', true, '2026-03-09 13:51:22.53057', '2026-08-11 14:34:02.327', NULL, NULL);
INSERT INTO public.usuarios (cod_usuario, nombre_usuario, contrasena, estado_usuario, creado_en, actualizado_en, token_recuperacion, expiracion_token) VALUES (2, 'admin', '$2a$12$9niNfV50wVYznlb/1pr42uszutPNhYu0LY3BvIFWiCp13vTVI8b0y', true, '2026-02-14 02:24:47.335391', '2026-08-11 14:16:58.968', NULL, NULL);


--
-- Data for Name: usuarios_rol; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.usuarios_rol (cod_usuario, cod_rol, fecha_asignacion, estado) VALUES (2, 1, '2026-02-14 02:24:47.878802', 1);
INSERT INTO public.usuarios_rol (cod_usuario, cod_rol, fecha_asignacion, estado) VALUES (3, 2, '2026-02-14 02:24:48.565291', 1);
INSERT INTO public.usuarios_rol (cod_usuario, cod_rol, fecha_asignacion, estado) VALUES (4, 3, '2026-02-14 02:24:49.415745', 1);
INSERT INTO public.usuarios_rol (cod_usuario, cod_rol, fecha_asignacion, estado) VALUES (7, 4, '2026-03-09 13:51:22.702991', 1);


--
-- Name: carrusel_imagenes_cod_imagen_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.carrusel_imagenes_cod_imagen_seq', 10, true);


--
-- Name: empresa_config_cod_config_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.empresa_config_cod_config_seq', 1, true);


--
-- Name: roles_cod_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.roles_cod_rol_seq', 4, true);


--
-- Name: usuarios_cod_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_cod_usuario_seq', 7, true);


--
-- PostgreSQL database dump complete
--

COMMIT;

\unrestrict sO0j6joi3uSJWnSIB7nbSBNiWTShNgD59n4u9hmmlMapagIJCP3EHVs6x2Kx8wp
