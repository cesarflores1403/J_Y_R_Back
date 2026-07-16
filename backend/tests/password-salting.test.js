import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

const password = 'JyR!Seguro2026#';
const saltA = await bcrypt.genSalt(12);
const saltB = await bcrypt.genSalt(12);
const hashA = await bcrypt.hash(password, saltA);
const hashB = await bcrypt.hash(password, saltB);

assert.notEqual(saltA, saltB);
assert.notEqual(hashA, hashB);
assert.equal(await bcrypt.compare(password, hashA), true);
assert.equal(await bcrypt.compare(password, hashB), true);
assert.match(hashA, /^\$2[aby]\$12\$/);
assert.match(hashB, /^\$2[aby]\$12\$/);

console.log('password-salting tests passed');
