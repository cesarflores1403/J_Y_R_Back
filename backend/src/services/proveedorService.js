import {Op,ForeignKeyConstraintError} from 'sequelize';
import Proveedor from '../models/ProveedorModel.js';
import { generarReportePdf } from '../utils/pdfReport.js';

const construirWhereProveedores=(buscar='')=>{
  const where={};

  if(buscar){
    where[Op.or]=[
      {nombre_proveedor:{[Op.iLike]:`%${buscar}%`}},
      {correo:{[Op.iLike]:`%${buscar}%`}},
      {pais:{[Op.iLike]:`%${buscar}%`}}
    ];
  }

  return where;
};

class ProveedorService{
  // Lista proveedores con búsqueda y ordena del más nuevo al más viejo
  async listar({pagina=1,limite=15,buscar=''}) {
    const where=construirWhereProveedores(buscar);

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

  async exportarReportePdf({buscar=''}={}) {
    const proveedores=await Proveedor.findAll({
      where:construirWhereProveedores(buscar),
      attributes:[
        'cod_proveedor',
        'nombre_proveedor',
        'telefono',
        'correo',
        'pais',
        'es_internacional',
        'validado',
        'estado_proveedor'
      ],
      order:[['cod_proveedor','DESC']]
    });

    return generarReportePdf({
      titulo:'Reporte de proveedores',
      filtros:[
        {label:'Busqueda',value:buscar||'Todos'}
      ],
      metricas:[
        {label:'Total de proveedores',value:proveedores.length}
      ],
      columnas:[
        {header:'#',key:'numero',width:28,align:'center'},
        {header:'ID',key:'id',width:42,align:'center'},
        {header:'Proveedor',key:'nombre',width:150},
        {header:'Telefono',key:'telefono',width:64},
        {header:'Correo',key:'correo',width:140},
        {header:'Pais',key:'pais',width:82},
        {header:'Internacional',key:'internacional',width:82},
        {header:'Validado',key:'validado',width:106},
        {header:'Estado',key:'estado',width:72}
      ],
      filas:proveedores.map((proveedor,index)=>({
        numero:index+1,
        id:proveedor.cod_proveedor,
        nombre:proveedor.nombre_proveedor,
        telefono:proveedor.telefono,
        correo:proveedor.correo,
        pais:proveedor.pais,
        internacional:proveedor.es_internacional?'Si':'No',
        validado:proveedor.validado||'-',
        estado:proveedor.estado_proveedor?'Activo':'Inactivo'
      }))
    });
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
