import assert from 'node:assert/strict';
import Usuario from '../src/models/Usuario.js';
import Rol from '../src/models/Rol.js';

const usuario = Usuario.build({
  cod_usuario: 1,
  nombre_usuario: 'admin',
  contrasena: '$2a$12$hashinterno',
  estado_usuario: true,
  creado_en: new Date('2026-01-01T00:00:00Z'),
  actualizado_en: new Date('2026-01-02T00:00:00Z')
});

const usuarioJson = usuario.toJSON();
assert.equal(usuarioJson.cod_usuario, 1);
assert.equal(usuarioJson.nombre_usuario, 'admin');
assert.equal(usuarioJson.estado_usuario, true);
assert.equal(Object.hasOwn(usuarioJson, 'contrasena'), false);
assert.equal(Object.hasOwn(usuarioJson, 'creado_en'), false);
assert.equal(Object.hasOwn(usuarioJson, 'actualizado_en'), false);

const rol = Rol.build({
  cod_rol: 1,
  nombre_rol: 'Administrador',
  descripcion: 'Gestion del sistema',
  fecha_creacion: new Date('2026-01-01T00:00:00Z')
});

const rolJson = rol.toJSON();
assert.equal(rolJson.cod_rol, 1);
assert.equal(rolJson.nombre_rol, 'Administrador');
assert.equal(rolJson.descripcion, 'Gestion del sistema');
assert.equal(Object.hasOwn(rolJson, 'fecha_creacion'), false);

console.log('api-payload-sanitization tests passed');
