import * as productoModel from '../models/producto.model.js';

// =====================================================
// SERVICE: Producto
// Intermediario entre controller y model
// =====================================================

// =======================
// GET PRODUCTO(S)
// =======================
export const getProducto = async () => {
  return await productoModel.getProducto(); // // Llama al model
};

// =======================
// CREATE PRODUCTO
// =======================
export const createProducto = async (datos) => {
  return await productoModel.createProducto(datos); // // Enviar datos al model
};

// =======================
// UPDATE PRODUCTO
// =======================
export const updateProducto = async ({ cod_producto, datos }) => {
  return await productoModel.updateProducto({
    cod_producto,
    datos
  }); // // Pasar PK y objeto JSON al model
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (cod_producto) => {
  return await productoModel.deleteProducto(cod_producto); // // Enviar PK al model
};