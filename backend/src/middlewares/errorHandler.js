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
      mensaje: 'Error de validación',
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      ok: false,
      mensaje: 'Registro duplicado',
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      ok: false,
      mensaje: 'Error de referencia: el registro relacionado no existe'
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    ok: false,
    message,
    mensaje: message,
  });
};
