import assert from 'node:assert/strict';

const productNamePattern = /^[\p{L}\p{N}][\p{L}\p{N}\s.,#()\/&+\-]*$/u;
const repeatedProductNamePattern = /^([\p{L}\p{N}])\1+$/u;
const hasRepeatedProductName = (value) => repeatedProductNamePattern.test(String(value || '').trim().replace(/\s+/g, ''));

const validNames = [
  'Filtro de aceite',
  'Bujía NGK BKR6E-11',
  'Aceite 10W-30',
  'Llanta 205/55 R16',
  'Kit reparación #2 (A+B)'
];

const invalidNames = [
  '',
  ' A',
  '<script>alert(1)</script>',
  'Producto; DROP TABLE producto',
  'Producto@Interno',
  'DDDDDDDDDD',
  'D D D D D',
  '111111'
];

for (const name of validNames) {
  assert.equal(productNamePattern.test(name.trim()), true, `Expected valid name: ${name}`);
}

for (const name of invalidNames) {
  assert.equal(productNamePattern.test(name) && !hasRepeatedProductName(name), false, `Expected invalid name: ${name}`);
}

console.log('product-name-format tests passed');
