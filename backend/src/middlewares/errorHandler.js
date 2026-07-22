// =====================================================
// MIDDLEWARE: errorHandler
// Maneja errores en un solo lugar (respuesta uniforme)
// =====================================================
export const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('Error capturado:', isProd ? err.message : err);

  const responder = (status, mensaje) => res.status(status).json({ ok: false, mensaje });

  // =====================================================
  // Errores de PostgreSQL (raw SQL / pool.query)
  // =====================================================

  // 23505 = unique_violation (PK o UNIQUE constraint)
  if (err.code === '23505') {
    return responder(409, 'Ya existe un registro con ese valor.');
  }

  // 23503 = foreign_key_violation
  if (err.code === '23503') {
    return responder(400, 'No se pudo completar la operacion porque el registro tiene datos relacionados.');
  }

  if (err.code === '23514') {
    return responder(400, 'El dato ingresado no cumple las reglas definidas.');
  }

  // 23502 = not_null_violation
  if (err.code === '23502') {
    return responder(400, 'Faltan datos requeridos.');
  }

  if (err.code === '22P02') {
    return responder(400, 'Tipo de dato inválido.');
  }

  // =====================================================
  // Errores de Sequelize
  // =====================================================
  if (err.name === 'SequelizeValidationError') {
    return responder(400, 'Error de validacion');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return responder(409, 'Registro duplicado');
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return responder(400, 'No se pudo completar la operacion porque el registro tiene datos relacionados.');
  }

  const status = err.status || err.statusCode || 500;
  const message = status >= 500
    ? 'Error interno del servidor'
    : (err.type === 'entity.parse.failed' ? 'Solicitud invalida' : (err.message || 'Solicitud invalida'));

  responder(status, message);
};
