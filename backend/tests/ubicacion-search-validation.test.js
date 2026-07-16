import assert from 'node:assert/strict';

const esBusquedaNumericaInvalida = (valor = '') => {
  const criterio = String(valor || '').trim();
  if (!criterio) return false;
  if (/^-\d/.test(criterio)) return true;
  if (/^\d+(?:[.,]\d+)?$/.test(criterio)) {
    return !Number.isInteger(Number(criterio.replace(',', '.'))) || Number(criterio.replace(',', '.')) < 1;
  }
  return false;
};

const invalidSearches = ['-1', '-10', '-3.5', '-3,5', ' -7 ', '-998', '0', '3.5'];
const validSearches = ['', '-', 'A-1', 'PROD-0001', 'Pasillo - Norte', '1', '10'];

for (const value of invalidSearches) {
  assert.equal(esBusquedaNumericaInvalida(value), true, `Expected invalid numeric search: ${value}`);
}

for (const value of validSearches) {
  assert.equal(esBusquedaNumericaInvalida(value), false, `Expected allowed search: ${value}`);
}

console.log('ubicacion-search-validation tests passed');
