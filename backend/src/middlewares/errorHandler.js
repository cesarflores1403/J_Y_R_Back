// =====================================================
// MIDDLEWARE: errorHandler
// Maneja errores en un solo lugar (respuesta uniforme)
// =====================================================
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', err);

  // Errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      ok: false,
      message: 'Error de validación',
      data: null,
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      ok: false,
      message: 'Registro duplicado',
      data: null,
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      ok: false,
      message: 'Error de referencia: el registro relacionado no existe',
      data: null
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    ok: false,
    message,
    data: null,
  });
};
