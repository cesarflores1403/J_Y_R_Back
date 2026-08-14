import bcrypt from 'bcryptjs';

const roles = [
  [1, 'Administrador', 'Rol de Administrador'],
  [2, 'Cajero', 'Rol de Cajero'],
  [3, 'Bodeguero', 'Rol de Bodeguero'],
  [4, 'Super Administrador', 'Acceso total al sistema sin restricciones'],
  [5, 'Vendedor', 'Gestion comercial de clientes, cotizaciones y ventas']
];

export const seedSystemData = async (client, { username, passwordHash }) => {
  for (const [id, name, description] of roles) {
    await client.query(
      `INSERT INTO roles (cod_rol, nombre_rol, descripcion)
       VALUES ($1, $2, $3)
       ON CONFLICT (cod_rol) DO UPDATE
       SET nombre_rol = EXCLUDED.nombre_rol, descripcion = EXCLUDED.descripcion`,
      [id, name, description]
    );
  }

  const orderStates = [
    [1, 'Pendiente', 1], [2, 'Aprobada', 2], [3, 'En Tránsito', 3],
    [4, 'Recibida', 4], [5, 'Cancelada', 5]
  ];
  for (const [id, name, order] of orderStates) {
    await client.query(
      `INSERT INTO cat_estado_orden_compra (cod_estado_oc, nombre, orden, activo)
       VALUES ($1, $2, $3, 1) ON CONFLICT (cod_estado_oc) DO NOTHING`,
      [id, name, order]
    );
  }

  const paymentMethods = [
    [1, 'Efectivo', 'Pago en efectivo'],
    [2, 'Tarjeta', 'Pago con tarjeta crédito/débito'],
    [3, 'Transferencia', 'Transferencia bancaria']
  ];
  for (const [id, name, description] of paymentMethods) {
    await client.query(
      `INSERT INTO cat_metodo_pago (cod_cat_metodo_pago, nombre, descripcion, estado)
       VALUES ($1, $2, $3, true) ON CONFLICT (cod_cat_metodo_pago) DO NOTHING`,
      [id, name, description]
    );
  }

  const taxes = [[1, 0, 'Exento'], [2, 15, 'ISV General 15%'], [3, 18, 'ISV Especial 18%']];
  for (const [id, percentage, description] of taxes) {
    await client.query(
      `INSERT INTO catalogo_isv (cod_isv, porcentaje, descripcion, estado)
       VALUES ($1, $2, $3, true) ON CONFLICT (cod_isv) DO NOTHING`,
      [id, percentage, description]
    );
  }

  if (username && passwordHash) {
    const user = await client.query(
      `INSERT INTO usuarios (nombre_usuario, contrasena, estado_usuario)
       VALUES ($1, $2, true) RETURNING cod_usuario`,
      [username, passwordHash]
    );
    await client.query(
      `INSERT INTO usuarios_rol (cod_usuario, cod_rol, estado)
       VALUES ($1, 4, 1)`,
      [user.rows[0].cod_usuario]
    );
  }

  const sequences = [
    ['roles', 'cod_rol'],
    ['cat_estado_orden_compra', 'cod_estado_oc'],
    ['cat_metodo_pago', 'cod_cat_metodo_pago'],
    ['catalogo_isv', 'cod_isv']
  ];
  for (const [table, column] of sequences) {
    await client.query(
      `SELECT setval(pg_get_serial_sequence($1, $2),
        (SELECT MAX(${column}) FROM ${table}), true)`,
      [table, column]
    );
  }
};

export const hashInitialPassword = (password) => bcrypt.hash(password, 12);
