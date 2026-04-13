import {Op,ForeignKeyConstraintError} from 'sequelize';
import Proveedor from '../models/ProveedorModel.js';

class ProveedorService{
  // Lista proveedores con búsqueda y ordena del más nuevo al más viejo
  async listar({pagina=1,limite=15,buscar=''}) {
    const where={};

    if(buscar){
      where[Op.or]=[
        {nombre_proveedor:{[Op.iLike]:`%${buscar}%`}},
        {correo:{[Op.iLike]:`%${buscar}%`}},
        {pais:{[Op.iLike]:`%${buscar}%`}}
      ];
    }

    const {count,rows}=await Proveedor.findAndCountAll({
      where,
      limit:parseInt(limite),
      offset:(parseInt(pagina)-1)*parseInt(limite),
      // Muestra primero el proveedor más reciente
      order:[['cod_proveedor','DESC']]
    });

    return {
      datos:rows,
      total:count,
      pagina:parseInt(pagina),
      totalPaginas:Math.ceil(count/parseInt(limite))
    };
  }

  // Obtiene un proveedor por id
  async obtenerPorId(id){
    const proveedor=await Proveedor.findByPk(id);
    if(!proveedor) throw Object.assign(new Error('Proveedor no encontrado'),{statusCode:404});
    return proveedor;
  }

  // Crea un proveedor nuevo
  async crear(datos){
    return Proveedor.create(datos);
  }

  // Actualiza proveedor existente
  async actualizar(id,datos){
    const proveedor=await this.obtenerPorId(id);
    await proveedor.update(datos);
    return proveedor;
  }

  // Activa o desactiva proveedor
  async toggleEstado(id){
    const proveedor=await this.obtenerPorId(id);
    await proveedor.update({estado_proveedor:!proveedor.estado_proveedor});
    return proveedor;
  }

  // Elimina proveedor o lo desactiva si tiene relaciones
  async eliminar(id){
    const proveedor=await this.obtenerPorId(id);

    try{
      await proveedor.destroy();
      return {accion:'eliminado',proveedor:null};
    }catch(error){
      if(error instanceof ForeignKeyConstraintError){
        if(proveedor.estado_proveedor){
          await proveedor.update({estado_proveedor:false});
        }
        return {accion:'desactivado',proveedor};
      }
      throw error;
    }
  }
}

export default new ProveedorService();
