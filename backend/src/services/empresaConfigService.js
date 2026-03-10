import EmpresaConfig from '../models/EmpresaConfig.js';

const empresaConfigService = {
  async obtener() {
    let config = await EmpresaConfig.findOne();
    if (!config) {
      // Crear con los datos por defecto si no existe
      config = await EmpresaConfig.create({
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
    }
    return config;
  },

  async actualizar(datos) {
    let config = await EmpresaConfig.findOne();
    if (!config) {
      config = await EmpresaConfig.create({ ...datos, actualizado_en: new Date() });
    } else {
      await config.update({ ...datos, actualizado_en: new Date() });
    }
    return config;
  }
};

export default empresaConfigService;
