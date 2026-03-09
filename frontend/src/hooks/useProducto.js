import { useEffect, useState } from 'react'; // // Hooks
import { productoApi } from '../services/producto.api.js'; // // API producto

export const useProducto = () => {
  const [producto, setProducto] = useState([]); // // Lista
  const [loading, setLoading] = useState(true); // // Loading lista
  const [saving, setSaving] = useState(false); // // Loading acciones (POST/PUT/DELETE)
  const [error, setError] = useState(''); // // Error general
  const [success, setSuccess] = useState(''); // // Mensaje éxito

  const limpiarMensajes = () => {
    setError(''); // // Limpia error
    setSuccess(''); // // Limpia success
  };

  const cargar = async () => {
    try {
      setLoading(true); // // Inicia carga
      limpiarMensajes(); // // Limpia mensajes

      const data = await productoApi.getAll(); // // GET (apiFetch retorna solo data)
      setProducto(Array.isArray(data) ? data : []); // // Set lista segura
    } catch (e) {
      setProducto([]); // // Evita datos viejos si falla
      setError(e.message || 'Error al cargar productos'); // // Error
    } finally {
      setLoading(false); // // Fin
    }
  };

  const crear = async (payload) => {
    try {
      setSaving(true); // // Inicia acción
      limpiarMensajes(); // // Limpia mensajes

      const productoCreado = await productoApi.create(payload); // // POST — retorna producto con cod_producto

      // HU-04: Mostrar el código único formateado (PROD-XXXX)
      const codigoUnico = productoCreado?.codigo_producto || productoCreado?.cod_producto;
      setSuccess(
        codigoUnico
          ? `Producto creado exitosamente. Código asignado: ${codigoUnico} ✅`
          : 'Producto creado correctamente ✅'
      );
      await cargar(); // // Refresca lista
      return productoCreado; // // HU-08: retornar para que el form pueda subir imagen
    } catch (e) {
      setError(e.message || 'Error al crear producto'); // // Error
    } finally {
      setSaving(false); // // Fin
    }
  };

  const actualizar = async (payload) => {
    try {
      setSaving(true); // // Inicia acción
      limpiarMensajes(); // // Limpia mensajes

      const result = await productoApi.update(payload); // // PUT (múltiples campos)

      // HU-05: Mensaje con detalle de campos actualizados
      const codigo = payload.cod_producto;
      const codigoFmt = `PROD-${String(codigo).padStart(4, '0')}`;
      const camposLegibles = {
        cod_categoria: 'Categoría',
        nombre_producto: 'Nombre',
        unidad_medida: 'Unidad',
        precio_venta: 'Precio',
        cod_isv: 'ISV',
        estado_producto: 'Estado'
      };
      const camposTexto = Object.keys(payload.datos).map(c => camposLegibles[c] || c).join(', ');
      setSuccess(`${codigoFmt} actualizado correctamente. Campos: ${camposTexto} ✅`);
      await cargar(); // // Refresca lista
    } catch (e) {
      setError(e.message || 'Error al actualizar producto'); // // Error
    } finally {
      setSaving(false); // // Fin
    }
  };

  const eliminar = async (payload) => {
    try {
      setSaving(true); // // Inicia acción
      limpiarMensajes(); // // Limpia mensajes

      await productoApi.remove(payload); // // DELETE (BE espera { cod_producto })
      setSuccess('Producto eliminado correctamente ✅'); // // Éxito
      await cargar(); // // Refresca lista
    } catch (e) {
      setError(e.message || 'Error al eliminar producto'); // // Error
    } finally {
      setSaving(false); // // Fin
    }
  };

  // =======================
  // CAMBIAR ESTADO (Activo/Inactivo/Descontinuado)
  // =======================
  const cambiarEstado = async (cod_producto, estado) => {
    try {
      setSaving(true);
      limpiarMensajes();

      const res = await productoApi.cambiarEstado({ cod_producto, estado });
      setSuccess(res?.message || `Estado cambiado a "${estado}" ✅`);
      await cargar();
    } catch (e) {
      setError(e.message || 'Error al cambiar estado del producto');
    } finally {
      setSaving(false);
    }
  };

  // =======================
  // HU-08: Subir / reemplazar imagen de producto
  // =======================
  const subirImagen = async (cod_producto, file) => {
    try {
      setSaving(true);
      limpiarMensajes();

      await productoApi.subirImagen(cod_producto, file);
      const codigoFmt = `PROD-${String(cod_producto).padStart(4, '0')}`;
      setSuccess(`Imagen de ${codigoFmt} actualizada correctamente \u2705`);
      await cargar();
    } catch (e) {
      setError(e.message || 'Error al subir imagen del producto');
    } finally {
      setSaving(false);
    }
  };

  // =======================
  // HU-08: Eliminar imagen de producto
  // =======================
  const eliminarImagenProducto = async (cod_producto) => {
    try {
      setSaving(true);
      limpiarMensajes();

      await productoApi.eliminarImagen(cod_producto);
      const codigoFmt = `PROD-${String(cod_producto).padStart(4, '0')}`;
      setSuccess(`Imagen de ${codigoFmt} eliminada correctamente \u2705`);
      await cargar();
    } catch (e) {
      setError(e.message || 'Error al eliminar imagen del producto');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    cargar(); // // Carga inicial
  }, []);

  return {
    producto, // // Lista
    loading, // // Loading lista
    saving, // // Loading acciones
    error, // // Mensaje error
    success, // // Mensaje éxito
    setError, // // Setter error
    setSuccess, // // Setter success
    cargar, // // Recargar lista
    crear, // // Acción POST
    actualizar, // // Acción PUT
    eliminar, // // Acción DELETE
    cambiarEstado, // // Cambiar estado (Activo/Inactivo/Descontinuado)
    subirImagen, // // HU-08: Subir/reemplazar imagen
    eliminarImagenProducto, // // HU-08: Eliminar imagen
  };
};


