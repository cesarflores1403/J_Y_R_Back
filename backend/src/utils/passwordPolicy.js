const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  '123456',
  '123456789',
  'password',
  'password1',
  'qwerty',
  'admin123',
  'letmein',
  'welcome',
  'iloveyou',
  'contrasena',
  'hola123',
  'abc123'
]);

const SEQUENTIAL_PATTERNS = [
  '012345',
  '123456',
  '234567',
  '345678',
  '456789',
  'abcdef',
  'qwerty',
  'asdfgh'
];

const PASSWORD_REQUIREMENTS_MESSAGE = [
  `La contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
  'incluir mayuscula, minuscula, numero y simbolo',
  'no contener espacios, secuencias comunes, repeticiones simples ni el nombre de usuario'
].join(', ');

const normalize = (value) => String(value || '').normalize('NFKC').toLowerCase();

export const validatePasswordPolicy = (password, { username } = {}) => {
  const errors = [];

  if (typeof password !== 'string') {
    return ['La contrasena es requerida'];
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`La contrasena debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contrasena debe incluir al menos una letra minuscula');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contrasena debe incluir al menos una letra mayuscula');
  }

  if (!/\d/.test(password)) {
    errors.push('La contrasena debe incluir al menos un numero');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('La contrasena debe incluir al menos un simbolo');
  }

  if (/\s/.test(password)) {
    errors.push('La contrasena no debe contener espacios');
  }

  const normalizedPassword = normalize(password);
  const normalizedUsername = normalize(username);

  if (COMMON_PASSWORDS.has(normalizedPassword)) {
    errors.push('La contrasena es demasiado comun');
  }

  if (SEQUENTIAL_PATTERNS.some((pattern) => normalizedPassword.includes(pattern))) {
    errors.push('La contrasena no debe contener secuencias comunes');
  }

  if (/(.)\1{5,}/.test(normalizedPassword)) {
    errors.push('La contrasena no debe contener repeticiones simples');
  }

  if (normalizedUsername.length >= 3 && normalizedPassword.includes(normalizedUsername)) {
    errors.push('La contrasena no debe contener el nombre de usuario');
  }

  return errors;
};

export const assertPasswordPolicy = (password, options = {}) => {
  const errors = validatePasswordPolicy(password, options);
  if (errors.length > 0) {
    throw Object.assign(new Error(PASSWORD_REQUIREMENTS_MESSAGE), {
      statusCode: 400,
      errors
    });
  }
};

export const passwordPolicyMessage = PASSWORD_REQUIREMENTS_MESSAGE;
