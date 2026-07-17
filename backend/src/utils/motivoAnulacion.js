const MOTIVOS_GENERICOS = new Set([
  'anular',
  'anulacion',
  'anulacion factura',
  'cancelar',
  'cancelacion',
  'cancelacion factura',
  'motivo',
  'justificacion',
  'error',
  'prueba',
  'test',
  'n/a',
  'na',
  'ninguno',
  'sin motivo',
  'no aplica'
]);

export const normalizarMotivoAnulacion = (motivo = '') => (
  String(motivo || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
);

export const validarMotivoAnulacion = (motivo = '') => {
  const texto = normalizarMotivoAnulacion(motivo);
  const textoPlano = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const letras = textoPlano.replace(/[^a-z0-9]/g, '');
  const palabras = textoPlano.split(/\s+/).filter(Boolean);
  const palabrasConSentido = palabras.filter((p) => p.length >= 3);
  const caracteresUnicos = new Set(letras).size;

  if (!texto) {
    return { valido: false, motivo: 'El motivo de anulacion es obligatorio' };
  }

  if (texto.length < 15) {
    return { valido: false, motivo: 'El motivo debe tener al menos 15 caracteres' };
  }

  if (texto.length > 500) {
    return { valido: false, motivo: 'El motivo no puede exceder 500 caracteres' };
  }

  if (palabrasConSentido.length < 3) {
    return { valido: false, motivo: 'El motivo debe explicar la causa con al menos 3 palabras' };
  }

  if (/^\d+$/.test(letras)) {
    return { valido: false, motivo: 'El motivo no puede contener solo numeros' };
  }

  if (/(.)\1{4,}/i.test(letras) || caracteresUnicos < 5) {
    return { valido: false, motivo: 'El motivo no parece una justificacion valida' };
  }

  if (MOTIVOS_GENERICOS.has(textoPlano)) {
    return { valido: false, motivo: 'El motivo es demasiado generico; detalle la causa real' };
  }

  return { valido: true, motivo: null, valor: texto };
};
