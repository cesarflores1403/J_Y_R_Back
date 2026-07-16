// =====================================================
// MIDDLEWARE: errorHandler
// Maneja errores en un solo lugar (respuesta uniforme)
// =====================================================
export const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error capturado:', err);
  } else {
    console.error('Error capturado:', err.message);
  }

  // =====================================================
  // Errores de PostgreSQL (raw SQL / pool.query)
  // =====================================================

  // 23505 = unique_violation (PK o UNIQUE constraint)
  if (err.code === '23505') {
    return res.status(409).json({
      ok: false,
      message: 'Ya existe un registro con ese valor.',
      data: null
    });
  }

  // 23503 = foreign_key_violation
  if (err.code === '23503') {
    return res.status(400).json({
      ok: false,
      message: 'No se pudo completar la operacion porque el registro tiene datos relacionados.',
      data: null
    });
  }

  // 23502 = not_null_violation
  if (err.code === '23502') {
    return res.status(400).json({
      ok: false,
      message: 'Faltan datos requeridos.',
      data: null
    });
  }

  // =====================================================
  // Errores de Sequelize
  // =====================================================
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      ok: false,
      message: 'Error de validacion',
      data: null
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      ok: false,
      message: 'Registro duplicado',
      data: null
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      ok: false,
      message: 'No se pudo completar la operacion porque el registro tiene datos relacionados.',
      data: null
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status >= 500
    ? 'Error interno del servidor'
    : (err.type === 'entity.parse.failed' ? 'Solicitud invalida' : (err.message || 'Solicitud invalida'));

  res.status(status).json({
    ok: false,
    message,
    data: null,
  });
};
