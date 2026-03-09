import EmpresaConfig from '../src/models/EmpresaConfig.js';
import { sequelize } from '../src/config/sequelize.js';

async function seedEmpresaConfig() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a BD');

    // Crear tabla si no existe
    await EmpresaConfig.sync({ alter: true });
    console.log('✅ Tabla empresa_config sincronizada');

    // Verificar si ya hay datos
    const existe = await EmpresaConfig.findOne();
    if (existe) {
      console.log('ℹ️  Ya existe configuración de empresa (cod_config:', existe.cod_config, ')');
      console.log('   Nombre:', existe.nombre);
      console.log('   RTN:', existe.rtn);
    } else {
      const config = await EmpresaConfig.create({
        nombre: 'J&R Accesorios y Reparaciones',
        rtn: '08011992200700',
        direccion: 'Bo. Villa Adela, 14 y 15 calle, 6 avenida esquina opuesta Gasolinera Uno, Comayagüela.',
        telefono: '9483-1906 / 8865-7197',
        correo: 'accesoriosjyr4@gmail.com',
        cai: '4A03DF-5A587E-8106E0-63BE03-09097B-B1',
        rango_autorizado: '000-001-01-00000351 al 000-001-01-00000450',
        fecha_limite_emision: '2026-08-04',
        propietaria: 'Prop. Ledy Lizzeth Chavarría',
        garantia: '2 MESES DE GARANTÍA POR FILTRACIÓN DE AGUA',
      });
      console.log('✅ Datos de empresa creados (cod_config:', config.cod_config, ')');
    }

    console.log('\n🎉 SEED EMPRESA CONFIG COMPLETADO');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedEmpresaConfig();
