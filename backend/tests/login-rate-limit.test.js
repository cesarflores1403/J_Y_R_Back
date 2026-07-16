import assert from 'node:assert/strict';
import express from 'express';

process.env.LOGIN_RATE_LIMIT_ENABLED = 'true';
process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '2';
process.env.LOGIN_RATE_LIMIT_WINDOW_SECONDS = '1';

const listen = (app) => new Promise((resolve) => {
  const server = app.listen(0, () => resolve(server));
});

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const requestJson = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify({
      nombre_usuario: options.nombre_usuario || 'usuario-inexistente',
      password: options.password || 'password-invalido'
    })
  });

  return {
    status: response.status,
    retryAfter: response.headers.get('retry-after'),
    body: await response.json()
  };
};

const createTestApp = (authRoutes) => {
  const app = express();

  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use('/api/auth', authRoutes);

  return app;
};

const createIpTestApp = (createLoginRateLimit) => {
  const app = express();
  const limiter = createLoginRateLimit({ maxAttempts: 1, windowSeconds: 30 });

  app.use(express.json());
  app.post('/login/:ip', (req, _res, next) => {
    Object.defineProperty(req, 'ip', {
      value: req.params.ip,
      configurable: true
    });
    next();
  }, limiter, (_req, res) => {
    res.status(401).json({ ok: false, mensaje: 'Credenciales invalidas' });
  });

  return app;
};

const createBurstTestApp = (createLoginRateLimit) => {
  const app = express();
  const limiter = createLoginRateLimit({ maxAttempts: 5, windowSeconds: 60 });
  let loginCalls = 0;

  app.use(express.json());
  app.post('/api/auth/login', limiter, (_req, res) => {
    loginCalls += 1;
    res.status(401).json({ ok: false, mensaje: 'Credenciales invalidas' });
  });

  return {
    app,
    getLoginCalls: () => loginCalls
  };
};

const run = async () => {
  const { default: authService } = await import('../src/services/authService.js');
  const originalLogin = authService.login;
  let loginCalls = 0;

  authService.login = async () => {
    loginCalls += 1;
    throw Object.assign(new Error('Credenciales invalidas'), { statusCode: 401 });
  };

  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { createLoginRateLimit } = await import('../src/middlewares/loginRateLimit.js');

  const app = createTestApp(authRoutes);
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const first = await requestJson(baseUrl, '/api/auth/login');
    assert.equal(first.status, 401);
    assert.equal(first.body.ok, false);
    assert.equal(first.body.mensaje, 'Credenciales invalidas');

    const second = await requestJson(baseUrl, '/api/auth/login');
    assert.equal(second.status, 401);
    assert.equal(loginCalls, 2);

    const blocked = await requestJson(baseUrl, '/api/auth/login');
    assert.equal(blocked.status, 429);
    assert.ok(blocked.retryAfter);
    assert.equal(blocked.body.ok, false);
    assert.match(blocked.body.mensaje, /intente nuevamente mas tarde/i);
    assert.doesNotMatch(blocked.body.mensaje, /usuario-inexistente/i);
    assert.equal(loginCalls, 2);

    const spoofed = await requestJson(baseUrl, '/api/auth/login', {
      headers: { 'X-Forwarded-For': '203.0.113.10' }
    });
    assert.equal(spoofed.status, 429);
    assert.equal(loginCalls, 2);

    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);

    await sleep(1100);
    const afterWindow = await requestJson(baseUrl, '/api/auth/login');
    assert.equal(afterWindow.status, 401);
    assert.equal(loginCalls, 3);
  } finally {
    await close(server);
    authService.login = originalLogin;
  }

  const ipServer = await listen(createIpTestApp(createLoginRateLimit));
  const ipBaseUrl = `http://127.0.0.1:${ipServer.address().port}`;

  try {
    const ipAFirst = await requestJson(ipBaseUrl, '/login/198.51.100.1');
    assert.equal(ipAFirst.status, 401);

    const ipABlocked = await requestJson(ipBaseUrl, '/login/198.51.100.1');
    assert.equal(ipABlocked.status, 429);

    const ipBFirst = await requestJson(ipBaseUrl, '/login/198.51.100.2');
    assert.equal(ipBFirst.status, 401);
  } finally {
    await close(ipServer);
  }

  const { app: burstApp, getLoginCalls: getBurstLoginCalls } = createBurstTestApp(createLoginRateLimit);
  const burstServer = await listen(burstApp);
  const burstBaseUrl = `http://127.0.0.1:${burstServer.address().port}`;
  const credentialCombos = Array.from({ length: 8 }, (_, index) => ({
    nombre_usuario: `usuario-${index + 1}`,
    password: `password-${index + 1}`
  }));

  try {
    const burstResponses = await Promise.all(
      credentialCombos.map((credentials) => requestJson(
        burstBaseUrl,
        '/api/auth/login',
        credentials
      ))
    );

    const normalFlowResponses = burstResponses.filter((response) => response.status === 401);
    const blockedResponses = burstResponses.filter((response) => response.status === 429);

    assert.equal(normalFlowResponses.length, 5);
    assert.equal(blockedResponses.length, 3);
    assert.equal(getBurstLoginCalls(), 5);

    for (const response of blockedResponses) {
      assert.ok(response.retryAfter);
      assert.equal(response.body.ok, false);
      assert.match(response.body.mensaje, /intente nuevamente mas tarde/i);
      assert.doesNotMatch(response.body.mensaje, /usuario-\d/i);
    }
  } finally {
    await close(burstServer);
  }
};

run()
  .then(() => {
    console.log('login-rate-limit tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
