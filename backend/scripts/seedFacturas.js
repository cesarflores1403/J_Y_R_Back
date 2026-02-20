import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// 1) Verificar/crear métodos de pago
const metodos = [
  { nombre: 'Efectivo', descripcion: 'Pago en efectivo' },
  { nombre: 'Tarjeta', descripcion: 'Pago con tarjeta crédito/débito' },
  { nombre: 'Transferencia', descripcion: 'Transferencia bancaria' },
];
for (const m of metodos) {
  const existe = await pool.query("SELECT cod_cat_metodo_pago FROM cat_metodo_pago WHERE nombre = $1", [m.nombre]);
  if (existe.rows.length === 0) {
    await pool.query("INSERT INTO cat_metodo_pago (nombre, descripcion, estado) VALUES ($1, $2, true)", [m.nombre, m.descripcion]);
    console.log(`Método de pago creado: ${m.nombre}`);
  } else {
    console.log(`Método de pago ya existe: ${m.nombre}`);
  }
}
// Obtener IDs de métodos de pago
const mpRows = await pool.query("SELECT cod_cat_metodo_pago, nombre FROM cat_metodo_pago ORDER BY cod_cat_metodo_pago");
const mpMap = {};
mpRows.rows.forEach(r => { mpMap[r.nombre] = r.cod_cat_metodo_pago; });
console.log('Métodos de pago:', mpMap);

// 2) Verificar/crear ubicación por defecto
let codUbicacion;
const ubRes = await pool.query("SELECT cod_ubicacion FROM ubicacion LIMIT 1");
if (ubRes.rows.length > 0) {
  codUbicacion = ubRes.rows[0].cod_ubicacion;
  console.log('Ubicación existente:', codUbicacion);
} else {
  const ins = await pool.query("INSERT INTO ubicacion (cod_ubicacion) VALUES (DEFAULT) RETURNING cod_ubicacion");
  codUbicacion = ins.rows[0].cod_ubicacion;
  console.log('Ubicación creada:', codUbicacion);
}

// 2) Insertar stock para los 6 productos
const productos = [2, 3, 8, 15, 22, 23];
for (const codProd of productos) {
  const existe = await pool.query("SELECT cod_inventario FROM inventario WHERE cod_producto = $1", [codProd]);
  if (existe.rows.length === 0) {
    const stock = Math.floor(Math.random() * 80) + 20; // 20-100
    await pool.query(
      "INSERT INTO inventario (cod_producto, cod_ubicacion, stock, stock_minimo, stock_maximo) VALUES ($1, $2, $3, 5, 100)",
      [codProd, codUbicacion, stock]
    );
    console.log(`Stock creado: producto ${codProd} => ${stock} unidades`);
  } else {
    console.log(`Stock ya existe para producto ${codProd}`);
  }
}

// 3) Login para obtener token
const http = await import('http');

function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.default.request({
      hostname: 'localhost', port: 5000,
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function apiPostAuth(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.default.request({
      hostname: 'localhost', port: 5000,
      path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Login como admin
const loginRes = await apiPost('/api/auth/login', { nombre_usuario: 'admin', password: 'Admin123!' });
const token = loginRes.token || loginRes.data?.token;
if (!token) {
  console.error('No se pudo obtener token:', loginRes);
  await pool.end();
  process.exit(1);
}
console.log('\nLogin OK, token obtenido');

// 4) Crear 3 facturas de prueba
const facturas = [
  {
    cod_cliente: 2, // Juan lópez
    metodo_pago: mpMap['Efectivo'],
    ref_pago: 'EF-001',
    items: [
      { cod_producto: 2, cantidad: 3 },  // Rines x3
      { cod_producto: 3, cantidad: 2 },  // Bujias x2
    ]
  },
  {
    cod_cliente: 3, // Pedro ordoñez
    metodo_pago: mpMap['Tarjeta'],
    ref_pago: 'TJ-4521',
    items: [
      { cod_producto: 8, cantidad: 1 },   // Filtros x1
      { cod_producto: 22, cantidad: 1 },   // Fricciones x1
      { cod_producto: 15, cantidad: 2 },   // prueba joan x2
    ]
  },
  {
    cod_cliente: 4, // Maria hernández
    metodo_pago: mpMap['Transferencia'],
    ref_pago: 'TRANSF-789',
    items: [
      { cod_producto: 3, cantidad: 5 },   // Bujias x5
      { cod_producto: 23, cantidad: 1 },   // hola 23 x1
    ]
  }
];

for (let i = 0; i < facturas.length; i++) {
  const res = await apiPostAuth('/api/facturas', facturas[i], token);
  if (res.status === 201) {
    const cod = res.body.datos?.cod_factura;
    console.log(`\n✅ Factura ${i + 1} creada => FAC-${String(cod).padStart(6, '0')}`);
    console.log(`   Cliente: ${facturas[i].cod_cliente}, Items: ${facturas[i].items.length}, Total: ${res.body.datos?.total}`);
  } else {
    console.error(`\n❌ Factura ${i + 1} error:`, res.body);
  }
}

await pool.end();
console.log('\n🎉 Seed de facturas completado');
