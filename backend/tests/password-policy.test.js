import assert from 'node:assert/strict';
import {
  assertPasswordPolicy,
  validatePasswordPolicy,
  passwordPolicyMessage
} from '../src/utils/passwordPolicy.js';

const weakPasswords = [
  { password: '123456', username: 'usuario', expected: /12 y 128/ },
  { password: 'aaaaaaaaaaaa', username: 'usuario', expected: /mayuscula/ },
  { password: 'AAAAAAAAAAAA', username: 'usuario', expected: /minuscula/ },
  { password: 'Password!!!!', username: 'usuario', expected: /numero/ },
  { password: 'Password1234', username: 'usuario', expected: /simbolo/ },
  { password: 'Password 123!', username: 'usuario', expected: /espacios/ },
  { password: 'Abcdef123456!', username: 'usuario', expected: /secuencias/ },
  { password: 'Usuario2026!!', username: 'usuario', expected: /nombre de usuario/ }
];

for (const { password, username, expected } of weakPasswords) {
  const errors = validatePasswordPolicy(password, { username });
  assert.ok(errors.length > 0, `Expected weak password to be rejected: ${password}`);
  assert.match(errors.join(' '), expected);
}

const strongPassword = 'JyR!Seguro2026#';
assert.deepEqual(validatePasswordPolicy(strongPassword, { username: 'usuario' }), []);
assert.doesNotThrow(() => assertPasswordPolicy(strongPassword, { username: 'usuario' }));

assert.throws(
  () => assertPasswordPolicy('123456', { username: 'usuario' }),
  (error) => error.statusCode === 400 && error.message === passwordPolicyMessage
);

console.log('password-policy tests passed');
