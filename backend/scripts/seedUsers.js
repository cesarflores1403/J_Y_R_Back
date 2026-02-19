/**
 * Script para insertar usuarios de prueba en la BD existente.
 * Ejecutar: npm run db:seed
 *
 * IMPORTANTE: Este script NO borra datos existentes.
 * Inserta usuarios, roles y asignaciones si no existen.
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

    // 1. Crear roles si no existen
    console.log('🔄 Verificando roles...');
    const roles = ['Administrador', 'Cajero', 'Bodeguero'];
    for (const nombre of roles) {
      const [result] = await sequelize.query(
        `SELECT cod_rol FROM roles WHERE nombre_rol = $1`, { bind: [nombre] }
      );
      if (result.length === 0) {
        await sequelize.query(
          `INSERT INTO roles (nombre_rol, descripcion) VALUES ($1, $2)`,
          { bind: [nombre, `Rol de ${nombre}`] }
        );
        console.log(`   ✅ Rol "${nombre}" creado`);
      } else {
        console.log(`   ⏩ Rol "${nombre}" ya existe`);
      }
    }

    // 2. Crear usuarios de prueba
    console.log('\n🔄 Creando usuarios de prueba...');
    const usuarios = [
      { nombre: 'admin', password: 'Admin123!', rol: 'Administrador' },
      { nombre: 'cajero', password: 'Cajero123!', rol: 'Cajero' },
      { nombre: 'bodeguero', password: 'Bodega123!', rol: 'Bodeguero' },
    ];

    for (const u of usuarios) {
      // Verificar si ya existe
      const [existe] = await sequelize.query(
        `SELECT cod_usuario FROM usuarios WHERE nombre_usuario = $1`, { bind: [u.nombre] }
      );

      let codUsuario;
      if (existe.length === 0) {
        const hash = await bcrypt.hash(u.password, 12);
        const [inserted] = await sequelize.query(
          `INSERT INTO usuarios (nombre_usuario, contrasena, estado_usuario)
           VALUES ($1, $2, true) RETURNING cod_usuario`,
          { bind: [u.nombre, hash] }
        );
        codUsuario = inserted[0].cod_usuario;
        console.log(`   ✅ Usuario "${u.nombre}" creado (cod: ${codUsuario})`);
      } else {
        codUsuario = existe[0].cod_usuario;
        // Actualizar contraseña por si cambió
        const hash = await bcrypt.hash(u.password, 12);
        await sequelize.query(
          `UPDATE usuarios SET contrasena = $1 WHERE cod_usuario = $2`,
          { bind: [hash, codUsuario] }
        );
        console.log(`   ⏩ Usuario "${u.nombre}" ya existe (cod: ${codUsuario}) - password actualizado`);
      }

      // 3. Asignar rol
      const [rolResult] = await sequelize.query(
        `SELECT cod_rol FROM roles WHERE nombre_rol = $1`, { bind: [u.rol] }
      );
      const codRol = rolResult[0].cod_rol;

      const [asignado] = await sequelize.query(
        `SELECT * FROM usuarios_rol WHERE cod_usuario = $1 AND cod_rol = $2`,
        { bind: [codUsuario, codRol] }
      );

      if (asignado.length === 0) {
        await sequelize.query(
          `INSERT INTO usuarios_rol (cod_usuario, cod_rol) VALUES ($1, $2)`,
          { bind: [codUsuario, codRol] }
        );
        console.log(`   ✅ Rol "${u.rol}" asignado a "${u.nombre}"`);
      } else {
        console.log(`   ⏩ Rol "${u.rol}" ya asignado a "${u.nombre}"`);
      }
    }

    console.log('\n🎉 SEED COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Credenciales de acceso:');
    console.log('  👤 admin     / Admin123!   (Administrador)');
    console.log('  👤 cajero    / Cajero123!  (Cajero)');
    console.log('  👤 bodeguero / Bodega123!  (Bodeguero)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seed();
