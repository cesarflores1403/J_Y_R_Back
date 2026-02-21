// =====================================================
// HU-03: Pruebas de casos borde — Validación de productos
// Ejecutar: node tests/producto-validacion.test.js
// Requiere: backend corriendo en localhost
// =====================================================

const BASE = process.env.API_URL || 'http://localhost:5000';
const ENDPOINT = `${BASE}/api/producto`;

// Helper para peticiones
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  return { status: res.status, data };
};

// Contadores
let passed = 0;
let failed = 0;
const results = [];

const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    results.push(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    results.push(`  ❌ ${name} → ${err.message}`);
  }
};

const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) throw new Error(`Esperado ${expected}, recibido ${actual}`);
  },
  toContain: (text) => {
    if (typeof actual === 'string' && !actual.includes(text)) throw new Error(`"${actual}" no contiene "${text}"`);
  },
  toBeTruthy: () => {
    if (!actual) throw new Error(`Esperado truthy, recibido ${actual}`);
  },
});

// =====================================================
// TESTS
// =====================================================
const run = async () => {
  console.log('\n🧪 HU-03: Pruebas de validación de productos\n');

  // ---- CREAR: Campos vacíos ----
  console.log('📋 POST /api/producto — Campos vacíos / inválidos');

  await test('Rechaza body vacío', async () => {
    const { status, data } = await fetchJson(ENDPOINT, { method: 'POST', body: '{}' });
    expect(status).toBe(400);
    expect(data.ok).toBe(false);
  });

  await test('Rechaza nombre vacío', async () => {
    const { status, data } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: '', unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
    const errNombre = data.errores?.find(e => e.campo === 'nombre_producto');
    expect(!!errNombre).toBeTruthy();
  });

  await test('Rechaza nombre < 2 caracteres', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'A', unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza nombre > 100 caracteres', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'X'.repeat(101), unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  // ---- CREAR: Precio ----
  console.log('\n📋 POST /api/producto — Precio');

  await test('Rechaza precio = 0', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'Test Precio Cero', unidad_medida: 'UND', precio_venta: 0, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza precio negativo', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'Test Precio Neg', unidad_medida: 'UND', precio_venta: -50, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza precio > 999999.99', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'Test Precio Max', unidad_medida: 'UND', precio_venta: 1000000, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  // ---- CREAR: Categoría inválida ----
  console.log('\n📋 POST /api/producto — Categoría');

  await test('Rechaza cod_categoria = 0', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 0, nombre_producto: 'Test Cat', unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza cod_categoria = 5', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 5, nombre_producto: 'Test Cat 5', unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
      }),
    });
    expect(status).toBe(400);
  });

  // ---- CREAR: ISV ----
  console.log('\n📋 POST /api/producto — ISV');

  await test('Rechaza sin cod_isv', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        cod_categoria: 1, nombre_producto: 'Test ISV', unidad_medida: 'UND', precio_venta: 100
      }),
    });
    expect(status).toBe(400);
  });

  // ---- CREAR: Duplicados ----
  console.log('\n📋 POST /api/producto — Duplicados');

  await test('Rechaza nombre duplicado (case insensitive)', async () => {
    // Intentar crear con un nombre que ya existe (lo primero de la BD)
    const { data: listData } = await fetchJson(ENDPOINT, { method: 'GET' });
    if (listData.data && listData.data.length > 0) {
      const existente = listData.data[0];
      const { status, data } = await fetchJson(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          cod_categoria: 1,
          nombre_producto: existente.nombre_producto.toLowerCase(), // minúsculas
          unidad_medida: 'UND', precio_venta: 100, cod_isv: 1
        }),
      });
      expect(status).toBe(409);
    }
  });

  // ---- UPDATE: Validaciones ----
  console.log('\n📋 PUT /api/producto — Validaciones de actualización');

  await test('Rechaza update sin cod_producto', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'PUT',
      body: JSON.stringify({ datos: { nombre_producto: 'Test' } }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza update con campo no permitido', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'PUT',
      body: JSON.stringify({ cod_producto: 1, datos: { campo_falso: 'valor' } }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza update con precio = 0', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'PUT',
      body: JSON.stringify({ cod_producto: 1, datos: { precio_venta: 0 } }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza update con precio negativo', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'PUT',
      body: JSON.stringify({ cod_producto: 1, datos: { precio_venta: -10 } }),
    });
    expect(status).toBe(400);
  });

  // ---- CAMBIAR ESTADO: Validaciones ----
  console.log('\n📋 PATCH /api/producto/estado — Estado');

  await test('Rechaza estado inválido', async () => {
    const { status } = await fetchJson(`${ENDPOINT}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ cod_producto: 1, estado: 'Eliminado' }),
    });
    expect(status).toBe(400);
  });

  await test('Rechaza sin cod_producto', async () => {
    const { status } = await fetchJson(`${ENDPOINT}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'Activo' }),
    });
    expect(status).toBe(400);
  });

  // ---- DELETE: Validaciones ----
  console.log('\n📋 DELETE /api/producto — Eliminar');

  await test('Rechaza delete sin cod_producto', async () => {
    const { status } = await fetchJson(ENDPOINT, {
      method: 'DELETE',
      body: '{}',
    });
    expect(status).toBe(400);
  });

  // ---- RESUMEN ----
  console.log('\n' + '='.repeat(50));
  results.forEach(r => console.log(r));
  console.log('='.repeat(50));
  console.log(`\n📊 Total: ${passed + failed} | ✅ ${passed} passed | ❌ ${failed} failed\n`);

  process.exit(failed > 0 ? 1 : 0);
};

run().catch(err => {
  console.error('Error ejecutando tests:', err);
  process.exit(1);
});
