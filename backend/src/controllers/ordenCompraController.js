import ordenCompraService from '../services/ordenCompraService.js';

// Listar órdenes
export const listar=async(req,res)=>{
  try{
    const datos=await ordenCompraService.listar(req.query);
    res.json({ok:true,...datos});
  }catch(error){
    res.status(500).json({ok:false,mensaje:error.message});
  }
};

// Obtener una orden por id
export const obtener=async(req,res)=>{
  try{
    const datos=await ordenCompraService.obtenerPorId(parseInt(req.params.id));
    res.json({ok:true,datos});
  }catch(error){
    res.status(error.statusCode||500).json({ok:false,mensaje:error.message});
  }
};

// Crear orden nueva
export const crear=async(req,res)=>{
  try{
    const datos=await ordenCompraService.crear({
      ...req.body,
      moneda:(req.body.moneda||'').toUpperCase().trim(),
      cod_usuario:req.usuario.cod_usuario
    });
    res.status(201).json({ok:true,datos});
  }catch(error){
    res.status(error.statusCode||500).json({ok:false,mensaje:error.message});
  }
};

// Cambiar estado
export const cambiarEstado=async(req,res)=>{
  try{
    const datos=await ordenCompraService.cambiarEstado(parseInt(req.params.id),req.body);
    res.json({ok:true,datos});
  }catch(error){
    res.status(error.statusCode||500).json({ok:false,mensaje:error.message});
  }
};

// Historial de una orden
export const historial=async(req,res)=>{
  try{
    const datos=await ordenCompraService.obtenerHistorial(parseInt(req.params.id));
    res.json({ok:true,datos});
  }catch(error){
    res.status(500).json({ok:false,mensaje:error.message});
  }
};

// Listar estados disponibles
export const listarEstados=async(req,res)=>{
  try{
    const datos=await ordenCompraService.listarEstados();
    res.json({ok:true,datos});
  }catch(error){
    res.status(500).json({ok:false,mensaje:error.message});
  }
};

// Eliminar orden
export const eliminar=async(req,res)=>{
  try{
    await ordenCompraService.eliminar(parseInt(req.params.id));
    res.json({ok:true,mensaje:'Orden eliminada correctamente'});
  }catch(error){
    res.status(400).json({ok:false,mensaje:error.message});
  }
};

// Listar productos disponibles
export const productosDisponibles=async(req,res)=>{
  try{
    const datos=await ordenCompraService.productosDisponibles(req.query.buscar||'');
    res.json({ok:true,datos});
  }catch(error){
    res.status(500).json({ok:false,mensaje:error.message});
  }
};
