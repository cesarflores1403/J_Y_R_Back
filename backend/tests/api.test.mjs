import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'A'.repeat(32);
process.env.JWT_EXPIRES_IN = '30m';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'postgres';
process.env.DB_APP_USER = 'jyr_app';
process.env.DB_APP_PASSWORD = 'app_password_placeholder';
process.env.DB_MAINTENANCE_USER = 'postgres';
process.env.DB_MAINTENANCE_PASSWORD = 'maintenance_password_placeholder';
process.env.DB_SSL = 'false';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173';
process.env.ALLOW_TUNNEL_ORIGINS = 'false';
process.env.LOGIN_RATE_LIMIT_ENABLED = 'true';
process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '2';
process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS = '60';

const authModule = await import('../src/middlewares/auth.js');
const limiterModule = await import('../src/middlewares/loginRateLimiter.js');
const errorHandlerModule = await import('../src/middlewares/errorHandler.js');
const securityModule = await import('../src/config/security.js');
const passwordPolicyModule = await import('../src/utils/passwordPolicy.js');
const pagoService = (await import('../src/services/pagoService.js')).default;
const sequelizeModule = await import('../src/config/sequelize.js');
const Usuario = (await import('../src/models/Usuario.js')).default;
const Factura = (await import('../src/models/Factura.js')).default;
const Pago = (await import('../src/models/Pago.js')).default;
const bitacoraFacturacionService = (await import('../src/services/bitacoraFacturacionService.js')).default;

const makeRes = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    }
  };

  return response;
};

const makeReq = (overrides = {}) => ({
  headers: {},
  cookies: {},
  body: {},
  method: 'POST',
  ip: '127.0.0.1',
  originalUrl: '/api/auth/login',
  url: '/api/auth/login',
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides
});

const restoreProperty = (target, name, originalValue) => {
  target[name] = originalValue;
};

test('JWT secret and password policy are enforced', () => {
  assert.equal(securityModule.getJwtSecret(), 'A'.repeat(32));

  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = '';
  assert.throws(() => securityModule.getJwtSecret(), /JWT_SECRET es obligatorio/);
  process.env.JWT_SECRET = '1234567890123456789012345678901';
  assert.throws(() => securityModule.getJwtSecret(), /al menos 32 caracteres/);
  process.env.JWT_SECRET = previousSecret;

  assert.ok(passwordPolicyModule.validatePasswordPolicy('JyR!Seguro2026#', { username: 'usuario' }).length === 0);
  assert.throws(() => passwordPolicyModule.assertPasswordPolicy('123456', { username: 'usuario' }));
});

test('auth middleware translates token failures and DB failures', async () => {
  const { autenticar } = authModule;
  const originalVerify = jwt.verify;
  const originalFindByPk = Usuario.findByPk;

  try {
    jwt.verify = () => {
      const error = new Error('invalid');
      error.name = 'JsonWebTokenError';
      throw error;
    };

    let res = makeRes();
    await autenticar(makeReq({ headers: { authorization: 'Bearer invalid' } }), res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.mensaje, 'Token invalido');

    jwt.verify = () => {
      const error = new Error('expired');
      error.name = 'TokenExpiredError';
      throw error;
    };

    res = makeRes();
    await autenticar(makeReq({ headers: { authorization: 'Bearer expired' } }), res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.mensaje, 'Token expirado');

    jwt.verify = () => ({ id: 10 });
    Usuario.findByPk = async () => null;

    res = makeRes();
    await autenticar(makeReq({ headers: { authorization: 'Bearer valid' } }), res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.mensaje, 'Token invalido o usuario inactivo');

    Usuario.findByPk = async () => { throw new Error('db down'); };

    res = makeRes();
    await autenticar(makeReq({ headers: { authorization: 'Bearer valid' } }), res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.mensaje, 'Error interno al validar la sesion');
  } finally {
    restoreProperty(jwt, 'verify', originalVerify);
    restoreProperty(Usuario, 'findByPk', originalFindByPk);
  }
});

test('login rate limit blocks after the configured threshold', async () => {
  const { loginRateLimiter } = limiterModule;
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const req = makeReq({ ip: '192.0.2.10' });
    const first = makeRes();
    let nextCalled = 0;

    await loginRateLimiter(req, first, () => { nextCalled += 1; });
    assert.equal(nextCalled, 1);

    const second = makeRes();
    await loginRateLimiter(req, second, () => { nextCalled += 1; });
    assert.equal(nextCalled, 2);

    const third = makeRes();
    await loginRateLimiter(req, third, () => { nextCalled += 1; });
    assert.equal(third.statusCode, 429);
    assert.equal(third.body.ok, false);
    assert.match(third.body.mensaje, /demasiados intentos/i);
  } finally {
    console.error = originalConsoleError;
  }
});

test('error handler translates PostgreSQL and Sequelize failures', () => {
  const { errorHandler } = errorHandlerModule;

  let res = makeRes();
  errorHandler({ code: '23505' }, makeReq(), res, () => {});
  assert.equal(res.statusCode, 409);
  assert.match(res.body.mensaje, /ya existe/i);

  res = makeRes();
  errorHandler({ code: '23503' }, makeReq(), res, () => {});
  assert.equal(res.statusCode, 400);

  res = makeRes();
  errorHandler({ code: '23514' }, makeReq(), res, () => {});
  assert.equal(res.statusCode, 400);

  res = makeRes();
  errorHandler({ code: '22P02' }, makeReq(), res, () => {});
  assert.equal(res.statusCode, 400);
});

test('payment service validates amounts, saldo and factura state', async () => {
  const originalTransaction = sequelizeModule.sequelize.transaction;
  const originalQuery = sequelizeModule.sequelize.query;
  const originalFacturaFindByPk = Factura.findByPk;
  const originalPagoCreate = Pago.create;
  const originalPagoFindByPk = Pago.findByPk;
  const originalUsuarioFindByPk = Usuario.findByPk;
  const originalBitacoraRegistrar = bitacoraFacturacionService.registrar;

  const fakeTransaction = { LOCK: { UPDATE: 'UPDATE' } };
  const stubs = {
    metodoLookup: 'active',
    totalPagado: 40,
    factura: null,
    updateFacturaPayload: null,
    paymentCreated: null,
    paymentUpdatePayload: null,
    paymentState: true
  };

  const createFactura = (overrides = {}) => ({
    cod_factura: 1,
    total: 100,
    total_pagado: 40,
    saldo: 60,
    estado_pago: 'PARCIAL',
    estado: true,
    update: async (payload) => {
      stubs.updateFacturaPayload = payload;
      return { ...createFactura(), ...payload };
    },
    ...overrides
  });

  const createPago = (overrides = {}) => ({
    cod_pago: 7,
    cod_factura: 1,
    monto: 25,
    metodo_pago: 1,
    ref_pago: null,
    observacion: null,
    estado: true,
    cod_usuario: 2,
    update: async (payload) => {
      stubs.paymentUpdatePayload = payload;
      return { ...createPago(), ...payload };
    },
    toJSON: () => ({
      cod_pago: 7,
      cod_factura: 1,
      monto: 25,
      metodo_pago: 1,
      ref_pago: null,
      observacion: null,
      estado: true,
      cod_usuario: 2
    }),
    ...overrides
  });

  try {
    sequelizeModule.sequelize.transaction = async (callback) => callback(fakeTransaction);
    sequelizeModule.sequelize.query = async (sql) => {
      if (String(sql).includes('cat_metodo_pago')) {
        if (stubs.metodoLookup === 'missing') {
          return [];
        }

        return [{ cod_cat_metodo_pago: 1, estado: stubs.metodoLookup === 'inactive' ? false : true }];
      }

      if (String(sql).includes('SUM(monto)')) {
        return [{ total_pagado: stubs.totalPagado }];
      }

      return [];
    };
    Usuario.findByPk = async () => ({ cod_usuario: 2, nombre_usuario: 'cajero', estado_usuario: true });
    bitacoraFacturacionService.registrar = async () => ({ ok: true });

    Factura.findByPk = async (codFactura) => {
      stubs.factura = createFactura({ cod_factura: codFactura });
      return stubs.factura;
    };

    Pago.create = async (payload) => {
      stubs.paymentCreated = payload;
      return createPago(payload);
    };

    Pago.findByPk = async () => createPago();

    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 0, metodo_pago: 1 }, 2),
      /monto debe ser mayor que cero/i
    );

    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: -5, metodo_pago: 1 }, 2),
      /monto debe ser mayor que cero/i
    );

    stubs.metodoLookup = 'active';
    stubs.totalPagado = 0;
    Factura.findByPk = async () => null;
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 404, monto: 10, metodo_pago: 1 }, 2),
      /Factura no encontrada/i
    );

    Factura.findByPk = async (codFactura) => createFactura({ cod_factura: codFactura });
    stubs.metodoLookup = 'missing';
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 10, metodo_pago: 99 }, 2),
      /método de pago no existe/i
    );

    stubs.metodoLookup = 'inactive';
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 10, metodo_pago: 1 }, 2),
      /método de pago está inactivo/i
    );

    stubs.metodoLookup = 'active';
    stubs.totalPagado = 95;
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 10, metodo_pago: 1 }, 2),
      /supera el saldo pendiente/i
    );

    stubs.totalPagado = 40;
    const parcial = await pagoService.registrarPago({ cod_factura: 1, monto: 25, metodo_pago: 1, ref_pago: 'ABC' }, 2);
    assert.equal(parcial.factura.total_pagado, 65);
    assert.equal(parcial.factura.saldo, 35);
    assert.equal(parcial.factura.estado_pago, 'PARCIAL');
    assert.equal(stubs.updateFacturaPayload.estado_pago, 'PARCIAL');

    stubs.totalPagado = 75;
    const pagada = await pagoService.registrarPago({ cod_factura: 1, monto: 25, metodo_pago: 1 }, 2);
    assert.equal(pagada.factura.saldo, 0);
    assert.equal(pagada.factura.estado_pago, 'PAGADA');

    Factura.findByPk = async () => createFactura({ estado: false, estado_pago: 'ANULADA' });
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 10, metodo_pago: 1 }, 2),
      /factura anulada/i
    );

    Factura.findByPk = async () => createFactura({ estado_pago: 'PAGADA', saldo: 0, total_pagado: 100 });
    await assert.rejects(
      () => pagoService.registrarPago({ cod_factura: 1, monto: 10, metodo_pago: 1 }, 2),
      /completamente pagada/i
    );

    Factura.findByPk = async () => createFactura();
    Pago.findByPk = async () => createPago();
    stubs.totalPagado = 40;
    const anulacion = await pagoService.anularPago(7, 2);
    assert.equal(anulacion.factura.total_pagado, 40);
    assert.equal(anulacion.factura.saldo, 60);
    assert.equal(anulacion.factura.estado_pago, 'PARCIAL');
    assert.deepEqual(stubs.paymentUpdatePayload, { estado: false });

    Pago.findByPk = async () => createPago({ estado: false });
    await assert.rejects(
      () => pagoService.anularPago(7, 2),
      /ya está anulado/i
    );
  } finally {
    sequelizeModule.sequelize.transaction = originalTransaction;
    sequelizeModule.sequelize.query = originalQuery;
    Factura.findByPk = originalFacturaFindByPk;
    Pago.create = originalPagoCreate;
    Pago.findByPk = originalPagoFindByPk;
    Usuario.findByPk = originalUsuarioFindByPk;
    bitacoraFacturacionService.registrar = originalBitacoraRegistrar;
  }
});
