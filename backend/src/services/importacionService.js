import * as XLSX from 'xlsx';
import pool from '../config/db-connection.js';

// =====================================================
// HU-12: Servicio de importación masiva de productos
// Parser CSV/Excel, validaciones, inserción transaccional
// =====================================================

// Columnas requeridas de la plantilla
const COLUMNAS_REQUERIDAS = [
  'nombre_producto',
  'cod_categoria',
  'unidad_medida',
  'precio_venta',
  'cod_isv',
];

// Columnas opcionales
const COLUMNAS_OPCIONALES = ['estado_producto', 'cod_ubicacion'];

const TODAS_LAS_COLUMNAS = [...COLUMNAS_REQUERIDAS, ...COLUMNAS_OPCIONALES];

// =======================
// Parsear archivo (CSV o Excel)
// =======================
const parsearArchivo = (buffer, originalname) => {
  const ext = (originalname || '').toLowerCase();
  const isCSV = ext.endsWith('.csv');

  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo está vacío o no contiene hojas.');

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) throw new Error('El archivo no contiene filas de datos.');

  return rows;
};

// =======================
// Validar que las columnas requeridas existan
// =======================
const validarColumnas = (filas) => {
  const columnas = Object.keys(filas[0]).map(c => c.trim().toLowerCase());
  const faltantes = COLUMNAS_REQUERIDAS.filter(req => !columnas.includes(req));

  if (faltantes.length > 0) {
    throw new Error(
      `Columnas requeridas faltantes: ${faltantes.join(', ')}. ` +
      `Las columnas requeridas son: ${COLUMNAS_REQUERIDAS.join(', ')}`
    );
  }
};

// =======================
// Normalizar claves de cada fila
// =======================
const normalizarClaves = (fila) => {
  const result = {};
  for (const [key, val] of Object.entries(fila)) {
    const k = key.trim().toLowerCase();
    if (TODAS_LAS_COLUMNAS.includes(k)) {
      result[k] = typeof val === 'string' ? val.trim() : val;
    }
  }
  return result;
};

// =======================
// Validar una fila individual
// =======================
const validarFila = (fila, idx, categoriasValidas, isvValidos, ubicacionesActivas, nombresExistentes, nombresEnArchivo) => {
  const errores = [];
  const numFila = idx + 2; // +2 porque fila 1 es cabecera, idx empieza en 0

  // nombre_producto
  const nombre = (fila.nombre_producto || '').trim();
  if (!nombre) {
    errores.push('nombre_producto es obligatorio');
  } else if (nombre.length < 2) {
    errores.push('nombre_producto debe tener al menos 2 caracteres');
  } else if (nombre.length > 100) {
    errores.push('nombre_producto no puede exceder 100 caracteres');
  } else {
    const nombreLower = nombre.toLowerCase();
    // Duplicado con BD
    if (nombresExistentes.has(nombreLower)) {
      errores.push(`nombre_producto "${nombre}" ya existe en la base de datos`);
    }
    // Duplicado dentro del archivo
    if (nombresEnArchivo.has(nombreLower)) {
      errores.push(`nombre_producto "${nombre}" está duplicado en el archivo`);
    }
  }

  // cod_categoria
  const codCat = Number(fila.cod_categoria);
  if (!fila.cod_categoria && fila.cod_categoria !== 0) {
    errores.push('cod_categoria es obligatorio');
  } else if (isNaN(codCat) || codCat < 1) {
    errores.push('cod_categoria debe ser un número entero positivo');
  } else if (!categoriasValidas.has(codCat)) {
    errores.push(`cod_categoria ${codCat} no existe o está inactiva`);
  }

  // unidad_medida
  const unidad = (fila.unidad_medida || '').trim();
  if (!unidad) {
    errores.push('unidad_medida es obligatoria');
  } else if (unidad.length > 10) {
    errores.push('unidad_medida no puede exceder 10 caracteres');
  }

  // precio_venta
  const precio = Number(fila.precio_venta);
  if (!fila.precio_venta && fila.precio_venta !== 0) {
    errores.push('precio_venta es obligatorio');
  } else if (isNaN(precio) || precio <= 0) {
    errores.push('precio_venta debe ser mayor a 0');
  } else if (precio > 999999.99) {
    errores.push('precio_venta no puede exceder 999,999.99');
  }

  // cod_isv
  const codIsv = Number(fila.cod_isv);
  if (!fila.cod_isv && fila.cod_isv !== 0) {
    errores.push('cod_isv es obligatorio');
  } else if (isNaN(codIsv) || codIsv < 1) {
    errores.push('cod_isv debe ser un número entero positivo');
  } else if (!isvValidos.has(codIsv)) {
    errores.push(`cod_isv ${codIsv} no existe en el catálogo de ISV`);
  }

  // estado_producto (opcional)
  if (fila.estado_producto) {
    const estado = fila.estado_producto.trim();
    if (!['Activo', 'Inactivo', 'Descontinuado'].includes(estado)) {
      errores.push('estado_producto debe ser: Activo, Inactivo o Descontinuado');
    }
  }

  // cod_ubicacion (opcional)
  if (fila.cod_ubicacion && String(fila.cod_ubicacion).trim() !== '') {
    const codUbi = Number(fila.cod_ubicacion);
    if (isNaN(codUbi) || codUbi < 1) {
      errores.push('cod_ubicacion debe ser un número entero positivo');
    } else if (!ubicacionesActivas.has(codUbi)) {
      errores.push(`cod_ubicacion ${codUbi} no existe o está inactiva`);
    }
  }

  return { numFila, errores };
};

// =======================
// IMPORTAR MASIVAMENTE
// =======================
export const importarProductos = async (buffer, originalname) => {
  // 1. Parsear archivo
  const filasRaw = parsearArchivo(buffer, originalname);

  // 2. Validar columnas
  validarColumnas(filasRaw);

  // 3. Normalizar claves
  const filas = filasRaw.map(normalizarClaves);

  // 4. Cargar catálogos para validación
  const [catResult, isvResult, ubiResult, prodResult] = await Promise.all([
    pool.query(`SELECT cod_categoria FROM categoria_producto WHERE estado_categoria = true`),
    pool.query(`SELECT cod_isv FROM catalogo_isv`),
    pool.query(`SELECT cod_ubicacion FROM ubicacion WHERE estado_ubi = 'ACTIVA'`),
    pool.query(`SELECT LOWER(TRIM(nombre_producto)) AS nombre FROM producto`),
  ]);

  const categoriasValidas = new Set(catResult.rows.map(r => r.cod_categoria));
  const isvValidos = new Set(isvResult.rows.map(r => r.cod_isv));
  const ubicacionesActivas = new Set(ubiResult.rows.map(r => r.cod_ubicacion));
  const nombresExistentes = new Set(prodResult.rows.map(r => r.nombre));

  // 5. Validar cada fila
  const erroresPorFila = [];
  const filasValidas = [];
  const nombresEnArchivo = new Set();

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const { numFila, errores } = validarFila(
      fila, i, categoriasValidas, isvValidos, ubicacionesActivas,
      nombresExistentes, nombresEnArchivo
    );

    if (errores.length > 0) {
      erroresPorFila.push({ fila: numFila, errores });
    } else {
      filasValidas.push(fila);
      // Registrar nombre para detectar duplicados internos
      nombresEnArchivo.add(fila.nombre_producto.trim().toLowerCase());
    }
  }

  // Si hay errores, retornar reporte sin insertar nada
  if (erroresPorFila.length > 0) {
    return {
      insertados: 0,
      totalFilas: filas.length,
      errores: erroresPorFila,
    };
  }

  // 6. Inserción masiva con transacción
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const fila of filasValidas) {
      const datos = {
        nombre_producto: fila.nombre_producto.trim(),
        cod_categoria: Number(fila.cod_categoria),
        unidad_medida: fila.unidad_medida.trim().toUpperCase(),
        precio_venta: Number(fila.precio_venta),
        cod_isv: Number(fila.cod_isv),
        estado_producto: fila.estado_producto?.trim() || 'Activo',
      };

      // Ubicación opcional
      if (fila.cod_ubicacion && String(fila.cod_ubicacion).trim() !== '') {
        datos.cod_ubicacion = Number(fila.cod_ubicacion);
      }

      const datosJson = JSON.stringify(datos);
      await client.query('CALL public.pa_insert($1, $2::json)', ['producto', datosJson]);
    }

    await client.query('COMMIT');

    return {
      insertados: filasValidas.length,
      totalFilas: filas.length,
      errores: [],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Error en la inserción masiva: ${err.message}`);
  } finally {
    client.release();
  }
};

// =======================
// GENERAR PLANTILLA CSV
// =======================
export const generarPlantillaCSV = () => {
  const headers = [...COLUMNAS_REQUERIDAS, ...COLUMNAS_OPCIONALES];
  const ejemplo = [
    'Filtro de aceite', '1', 'UND', '150.00', '1', 'Activo', '',
  ];
  const csv = [headers.join(','), ejemplo.join(',')].join('\n');
  return csv;
};
