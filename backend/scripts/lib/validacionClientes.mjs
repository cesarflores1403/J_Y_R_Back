// Reglas de validación de clientes, espejo exacto de backend/src/routes/clientes.js
// Se usan tanto en la auditoría como en la depuración para garantizar que el
// scrubbing quede alineado al 100% con las validaciones del sistema.

export const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
export const REGEX_TEXTO_CON_PUNTO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]+$/;
export const REGEX_CORREO_PERMITIDO = /^[A-Za-z0-9@.]+$/;
// Validación de formato de correo simple y suficiente para el depurado.
export const REGEX_CORREO_FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const s = (v) => (v == null ? '' : String(v).trim());

// Devuelve la lista de códigos de error de un cliente contra las reglas nuevas.
// Un cliente válido devuelve un arreglo vacío.
export function validarCliente(c) {
  const errores = [];

  const nombre = s(c.nombre);
  if (!nombre) errores.push('nombre:vacio');
  else if (nombre.length > 10) errores.push('nombre:excede_10');
  else if (!REGEX_SOLO_LETRAS.test(nombre)) errores.push('nombre:caracteres_invalidos');

  const apellido = s(c.apellido);
  if (!apellido) errores.push('apellido:vacio');
  else if (apellido.length > 10) errores.push('apellido:excede_10');
  else if (!REGEX_SOLO_LETRAS.test(apellido)) errores.push('apellido:caracteres_invalidos');

  const dni = s(c.dni);
  if (!dni) errores.push('dni:vacio');
  else if (!/^\d{13}$/.test(dni)) errores.push('dni:no_son_13_digitos');

  const rtn = s(c.rtn);
  if (rtn && !/^\d{14}$/.test(rtn)) errores.push('rtn:no_son_14_digitos');

  const empresa = s(c.empresa);
  if (!empresa) errores.push('empresa:vacia');
  else if (empresa.length > 15) errores.push('empresa:excede_15');
  else if (!REGEX_TEXTO_CON_PUNTO.test(empresa)) errores.push('empresa:caracteres_invalidos');

  const telefono = s(c.telefono);
  if (!telefono) errores.push('telefono:vacio');
  else if (!/^\d{8}$/.test(telefono)) errores.push('telefono:no_son_8_digitos');

  const correo = s(c.correo);
  if (!correo) errores.push('correo:vacio');
  else if (correo.length > 30) errores.push('correo:excede_30');
  else if (!REGEX_CORREO_PERMITIDO.test(correo) || !REGEX_CORREO_FORMATO.test(correo)) {
    errores.push('correo:formato_invalido');
  }

  const direccion = s(c.direccion);
  if (!direccion) errores.push('direccion:vacia');
  else if (direccion.length > 60) errores.push('direccion:excede_60');
  else if (!REGEX_TEXTO_CON_PUNTO.test(direccion)) errores.push('direccion:caracteres_invalidos');

  return errores;
}

// Aplica SOLO normalizaciones deterministas y seguras (no inventa datos):
//  - recorta espacios
//  - correo a minúsculas
//  - quita separadores no numéricos de dni/telefono/rtn (guiones, espacios)
//  - rtn vacío -> null
// Devuelve { cambiado, valores } con los campos ya normalizados.
export function normalizarCliente(c) {
  const original = {
    nombre: c.nombre, apellido: c.apellido, dni: c.dni, rtn: c.rtn,
    empresa: c.empresa, telefono: c.telefono, correo: c.correo, direccion: c.direccion
  };

  const soloDigitos = (v) => (v == null ? v : String(v).replace(/\D/g, ''));
  const recorta = (v) => (v == null ? v : String(v).trim());

  const valores = {
    nombre: recorta(c.nombre),
    apellido: recorta(c.apellido),
    dni: c.dni == null ? c.dni : soloDigitos(c.dni),
    empresa: recorta(c.empresa),
    telefono: c.telefono == null ? c.telefono : soloDigitos(c.telefono),
    correo: c.correo == null ? c.correo : recorta(c.correo).toLowerCase(),
    direccion: recorta(c.direccion)
  };

  // rtn: quita separadores; si queda vacío, null
  const rtnLimpio = c.rtn == null ? null : soloDigitos(c.rtn);
  valores.rtn = rtnLimpio ? rtnLimpio : null;

  const cambiado = Object.keys(valores).some((k) => valores[k] !== original[k]);
  return { cambiado, valores };
}
