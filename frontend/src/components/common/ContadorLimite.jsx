import React from 'react';

/**
 * ContadorLimite — retroalimentacion de limite de caracteres para campos de
 * texto libre (observaciones, descripciones, referencias).
 *
 * Es PRESENTACIONAL: se coloca justo debajo del <input>/<textarea> y no altera
 * su onChange ni su logica. Muestra un contador n/max y, al alcanzar el tope,
 * una alerta clara indicando que se llego al limite permitido.
 *
 *   <textarea ... value={x} maxLength={500}
 *     onChange={(e) => setX(e.target.value.slice(0, 500))} />
 *   <ContadorLimite value={x} max={500} />
 */
const ContadorLimite = ({ value = '', max = 500, id }) => {
  const longitud = (value == null ? '' : String(value)).length;
  const enLimite = longitud >= max;
  const contadorId = id ? `${id}-contador` : undefined;
  const alertaId = id ? `${id}-limite` : undefined;

  return (
    <>
      <div className="d-flex justify-content-end">
        <small id={contadorId} className={enLimite ? 'text-danger fw-semibold' : 'text-muted'}>
          {longitud}/{max}
        </small>
      </div>
      {enLimite && (
        <div
          id={alertaId}
          className="alert alert-warning py-1 px-2 mb-0 mt-1"
          role="alert"
          style={{ fontSize: 12 }}
        >
          Ha alcanzado el límite máximo de {max} caracteres permitidos.
        </div>
      )}
    </>
  );
};

export default ContadorLimite;
