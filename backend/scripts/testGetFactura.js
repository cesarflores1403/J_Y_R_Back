(async () => {
  try {
    const base = 'http://localhost:5000/api';
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_usuario: 'admin', password: 'Admin123!' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN:', loginJson.ok);
    const token = loginJson.token;
    const id = 26;
    const res = await fetch(`${base}/facturas/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    console.log('FACTURA GET:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
