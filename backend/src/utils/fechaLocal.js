export const ZONA_HORARIA_LOCAL = process.env.APP_TIMEZONE || 'America/Tegucigalpa';

export const OPCIONES_FECHA_HORA_LOCAL = {
  timeZone: ZONA_HORARIA_LOCAL,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

export const formatearFechaHoraLocal = (valor) => {
  if (!valor) return '';

  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return fecha.toLocaleString('es-HN', OPCIONES_FECHA_HORA_LOCAL);
};
