const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const TUNNEL_ENV_FILE = path.join(ROOT_DIR, '.env.tunnel');

function loadSimpleEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#')) continue;

    const idx = cleaned.indexOf('=');
    if (idx <= 0) continue;

    const key = cleaned.slice(0, idx).trim();
    let value = cleaned.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadSimpleEnvFile(TUNNEL_ENV_FILE);

const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 5173);
const FRONTEND_PORT_CANDIDATES = process.env.FRONTEND_PORT_CANDIDATES
  ? process.env.FRONTEND_PORT_CANDIDATES.split(',').map((p) => Number(p.trim())).filter((p) => Number.isInteger(p) && p > 0)
  : [FRONTEND_PORT, FRONTEND_PORT + 1, FRONTEND_PORT + 2];
const FRONTEND_HOSTS = process.env.FRONTEND_HOSTS
  ? process.env.FRONTEND_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
  : ['localhost', '127.0.0.1', '::1'];
const PUBLIC_URL_FILE = path.join(ROOT_DIR, 'public-url.txt');
const TUNNEL_TOKEN = String(process.env.TUNNEL_TOKEN || '').trim();
const TUNNEL_PUBLIC_URL = String(process.env.TUNNEL_PUBLIC_URL || '').trim();
const USE_FIXED_TUNNEL = Boolean(TUNNEL_TOKEN);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function canConnect(port, host, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));

    socket.connect(port, host);
  });
}

async function waitForFrontend(maxAttempts = 180, delayMs = 1000) {
  const esFrontendVite = async (host, port) => {
    const canReachPort = await canConnect(port, host);
    if (!canReachPort) return false;

    return new Promise((resolve) => {
      const req = http.get({ host, port, path: '/', timeout: 1500 }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve(body.includes('/@vite/client') || body.toLowerCase().includes('<!doctype html'));
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.on('error', () => resolve(false));
    });
  };

  for (let i = 1; i <= maxAttempts; i += 1) {
    let match = null;
    for (const host of FRONTEND_HOSTS) {
      for (const port of FRONTEND_PORT_CANDIDATES) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await esFrontendVite(host, port);
        if (ok) {
          match = { host, port };
          break;
        }
      }
      if (match) break;
    }

    if (match) return match;
    if (i % 10 === 0) {
      console.log(`[tunnel] Esperando frontend en puertos ${FRONTEND_PORT_CANDIDATES.join(', ')}... (${i}/${maxAttempts})`);
    }
    await sleep(delayMs);
  }
  return null;
}

function buildCandidateList() {
  const list = [];

  if (process.env.CLOUDFLARED_PATH) {
    list.push(process.env.CLOUDFLARED_PATH);
  }

  if (process.platform === 'win32') {
    list.push('cloudflared.exe');

    if (process.env.LOCALAPPDATA) {
      list.push(path.join(
        process.env.LOCALAPPDATA,
        'Microsoft',
        'WinGet',
        'Packages',
        'Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe',
        'cloudflared.exe'
      ));
    }
  }

  list.push('cloudflared');

  return [...new Set(list)];
}

function isPathLike(cmd) {
  return cmd.includes('\\') || cmd.includes('/') || cmd.includes(':');
}

function existsIfPathLike(cmd) {
  if (!isPathLike(cmd)) return true;
  try {
    return fs.existsSync(cmd);
  } catch {
    return false;
  }
}

function forwardStream(stream, writer, onLine) {
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      writer(line);
      if (onLine) onLine(line);
    }
  });

  stream.on('end', () => {
    if (buffer) {
      writer(buffer);
      if (onLine) onLine(buffer);
    }
  });
}

async function startTunnelWithCandidates(candidates, args) {

  for (const candidate of candidates) {
    if (!existsIfPathLike(candidate)) continue;

    const child = spawn(candidate, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const started = await new Promise((resolve) => {
      child.once('spawn', () => resolve(true));
      child.once('error', (err) => {
        if (err && err.code === 'ENOENT') {
          resolve(false);
          return;
        }
        console.error(`[tunnel] Error al iniciar ${candidate}: ${err.message}`);
        resolve(false);
      });
    });

    if (!started) continue;

    return { child, candidate };
  }

  return null;
}

(async () => {
  if (USE_FIXED_TUNNEL) {
    console.log('[tunnel] Modo fijo activado (token configurado).');
    if (TUNNEL_PUBLIC_URL) {
      try {
        fs.writeFileSync(PUBLIC_URL_FILE, `${TUNNEL_PUBLIC_URL}\n`, 'utf8');
        console.log(`[tunnel] URL fija guardada en: ${PUBLIC_URL_FILE}`);
      } catch (err) {
        console.error(`[tunnel] No se pudo guardar URL fija: ${err.message}`);
      }
    } else {
      console.warn('[tunnel] TUNNEL_PUBLIC_URL no definido. Configuralo en .env.tunnel para guardar tu URL fija.');
    }
  } else {
    console.log('[tunnel] Modo rapido activado (URL temporal).');
  }

  console.log('[tunnel] Esperando a que frontend inicie...');
  const frontend = await waitForFrontend();

  if (!frontend) {
    console.error('[tunnel] No se pudo detectar frontend en los puertos esperados.');
    process.exit(1);
  }

  const FRONTEND_URL = `http://${frontend.host}:${frontend.port}`;
  console.log(`[tunnel] Frontend detectado en: ${FRONTEND_URL}`);

  const candidates = buildCandidateList();
  const args = USE_FIXED_TUNNEL
    ? ['tunnel', 'run', '--token', TUNNEL_TOKEN]
    : ['tunnel', '--url', FRONTEND_URL, '--no-autoupdate'];
  const started = await startTunnelWithCandidates(candidates, args);

  if (!started) {
    console.error('[tunnel] No se encontró cloudflared. Instala Cloudflare Tunnel o define CLOUDFLARED_PATH.');
    process.exit(1);
  }

  const { child, candidate } = started;
  console.log(`[tunnel] cloudflared iniciado con: ${candidate}`);

  let announced = USE_FIXED_TUNNEL && Boolean(TUNNEL_PUBLIC_URL);
  const announceUrl = (line) => {
    if (announced) return;
    const match = USE_FIXED_TUNNEL
      ? line.match(/https:\/\/[^\s]+/i)
      : line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (!match) return;
    announced = true;
    const url = match[0];
    console.log(`[tunnel] URL publica: ${url}`);
    try {
      fs.writeFileSync(PUBLIC_URL_FILE, `${url}\n`, 'utf8');
      console.log(`[tunnel] URL guardada en: ${PUBLIC_URL_FILE}`);
    } catch (err) {
      console.error(`[tunnel] No se pudo guardar URL en archivo: ${err.message}`);
    }
  };

  forwardStream(child.stdout, (line) => console.log(`[tunnel] ${line}`), announceUrl);
  forwardStream(child.stderr, (line) => console.log(`[tunnel] ${line}`), announceUrl);

  const shutdown = () => {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  child.on('exit', (code) => {
    console.log(`[tunnel] Finalizado (codigo ${code ?? 'null'}).`);
    process.exit(code ?? 0);
  });
})();
