/**
 * Script para crear el rol y usuario Super Administrador.
 * Ejecutar: node backend/scripts/seedSuperAdmin.js
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
const { sequelize } = await import('../src/config/sequelize.js');

const seed = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // 1. Crear rol Super Administrador si no existe
    console.log('🔄 Verificando rol Super Administrador...');
    const [rolExiste] = await sequelize.query(
      `SELECT cod_rol FROM roles WHERE nombre_rol = $1`, { bind: ['Super Administrador'] }
    );

    let codRol;
    if (rolExiste.length === 0) {
      const [inserted] = await sequelize.query(
        `INSERT INTO roles (nombre_rol, descripcion) VALUES ($1, $2) RETURNING cod_rol`,
        { bind: ['Super Administrador', 'Acceso total al sistema sin restricciones'] }
      );
      codRol = inserted[0].cod_rol;
      console.log(`   ✅ Rol "Super Administrador" creado (cod: ${codRol})`);
    } else {
      codRol = rolExiste[0].cod_rol;
      console.log(`   ⏩ Rol "Super Administrador" ya existe (cod: ${codRol})`);
    }

    // 2. Crear usuario superadmin
    console.log('\n🔄 Creando usuario Mantenimiento...');
    const nombre = 'Mantenimiento';
    const password = '3McDell321!';

    const [existe] = await sequelize.query(
      `SELECT cod_usuario FROM usuarios WHERE nombre_usuario = $1`, { bind: [nombre] }
    );

    let codUsuario;
    if (existe.length === 0) {
      const hash = await bcrypt.hash(password, 12);
      const [inserted] = await sequelize.query(
        `INSERT INTO usuarios (nombre_usuario, contrasena, estado_usuario)
         VALUES ($1, $2, true) RETURNING cod_usuario`,
        { bind: [nombre, hash] }
      );
      codUsuario = inserted[0].cod_usuario;
      console.log(`   ✅ Usuario "${nombre}" creado (cod: ${codUsuario})`);
    } else {
      codUsuario = existe[0].cod_usuario;
      const hash = await bcrypt.hash(password, 12);
      await sequelize.query(
        `UPDATE usuarios SET contrasena = $1 WHERE cod_usuario = $2`,
        { bind: [hash, codUsuario] }
      );
      console.log(`   ⏩ Usuario "${nombre}" ya existe (cod: ${codUsuario}) - password actualizado`);
    }

    // 3. Asignar rol
    const [asignado] = await sequelize.query(
      `SELECT * FROM usuarios_rol WHERE cod_usuario = $1 AND cod_rol = $2`,
      { bind: [codUsuario, codRol] }
    );

    if (asignado.length === 0) {
      await sequelize.query(
        `INSERT INTO usuarios_rol (cod_usuario, cod_rol) VALUES ($1, $2)`,
        { bind: [codUsuario, codRol] }
      );
      console.log(`   ✅ Rol "Super Administrador" asignado a "${nombre}"`);
    } else {
      console.log(`   ⏩ Rol ya asignado`);
    }

    console.log('\n🎉 SUPER ADMIN CREADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  👑 Mantenimiento / 3McDell321!  (Super Administrador)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seed();
