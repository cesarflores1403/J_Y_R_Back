(async () => {
  try {
    const base = 'http://localhost:5000/api';
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_usuario: 'admin', password: 'Admin123!' })
    });
    const loginJson = await loginRes.json().catch(() => ({ ok: false, message: 'invalid json' }));
    console.log('LOGIN RESPONSE:\n', JSON.stringify(loginJson, null, 2));

    if (!loginJson.ok || !loginJson.token) {
      console.error('\nNo se obtuvo token. Detener.');
      process.exit(0);
    }

    const token = loginJson.token;
    const factRes = await fetch(`${base}/facturas`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const factJson = await factRes.json().catch(() => ({ ok: false, message: 'invalid json' }));
    console.log('\nFACTURAS RESPONSE:\n', JSON.stringify(factJson, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  }
})();
