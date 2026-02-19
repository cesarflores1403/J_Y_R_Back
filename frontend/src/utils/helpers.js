export const formatMoney = (value) => {
  const num = parseFloat(value) || 0;
  return 'L ' + num.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const getInitials = (nombre) => {
  if (!nombre) return '?';
  return nombre.substring(0, 2).toUpperCase();
};
