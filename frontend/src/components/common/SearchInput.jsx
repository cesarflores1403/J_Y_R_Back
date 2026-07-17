import React, { forwardRef } from 'react';
import { toast } from 'react-toastify';
import { MAX_LEN_BUSQUEDA, sanitizarBusqueda } from '../../utils/busqueda.js';

/**
 * SearchInput — campo de busqueda endurecido y reutilizable.
 *
 * Drop-in de <input>: renderiza UNICAMENTE el input (sin envoltorios ni
 * elementos hermanos), por lo que preserva el layout de cada buscador donde se
 * inserte. Integra de forma transparente:
 *   - Sanitizacion de la entrada (sanitizarBusqueda): quita caracteres de
 *     control/inyeccion, colapsa espacios y recorta a un tope duro de longitud.
 *   - Restriccion de longitud maxima (atributo maxLength nativo + recorte en JS).
 *   - Retroalimentacion al usuario mediante un toast no intrusivo (con toastId
 *     unico para que NUNCA se apile) al alcanzar el limite.
 *
 * IMPORTANTE: onChange recibe el texto YA SANEADO (string), no el evento.
 *   <SearchInput value={x} onChange={(val) => setX(val)} ... />
 */
const SearchInput = forwardRef(function SearchInput(
  { value, onChange, maxLength = MAX_LEN_BUSQUEDA, onLimite, ...rest },
  ref
) {
  const manejarCambio = (e) => {
    // Nunca dejamos que el manejador lance: cualquier fallo degrada a "sin cambio".
    let bruto = '';
    try {
      bruto = e?.target?.value ?? '';
    } catch {
      bruto = '';
    }

    const limpio = sanitizarBusqueda(bruto, maxLength);

    // Retroalimentacion clara cuando la entrada toca el limite o fue recortada.
    if (bruto.length > limpio.length || limpio.length >= maxLength) {
      toast.info(`La busqueda admite un maximo de ${maxLength} caracteres.`, {
        toastId: 'buscador-limite', // dedup: un solo mensaje a la vez
        autoClose: 2500,
      });
      if (typeof onLimite === 'function') onLimite();
    }

    if (typeof onChange === 'function') onChange(limpio);
  };

  return (
    <input
      type="text"
      autoComplete="off"
      {...rest}
      ref={ref}
      value={value ?? ''}
      onChange={manejarCambio}
      maxLength={maxLength}
    />
  );
});

export default SearchInput;
