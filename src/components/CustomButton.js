import React from "react";
import { Button } from "react-bootstrap";
import PropTypes from "prop-types";

/**
 * Componente de botón personalizado
 * @param {string} variant - Variante de Bootstrap (primary, danger, success, etc.)
 * @param {string} size - Tamaño del botón (sm, md, lg)
 * @param {boolean} isLoading - Mostrar estado de carga
 * @param {function} onClick - Función a ejecutar al hacer clic
 * @param {ReactNode} children - Contenido del botón
 * @param {boolean} disabled - Deshabilitar botón
 * @param {string} className - Clases CSS adicionales
 */
function CustomButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  onClick,
  children,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

CustomButton.propTypes = {
  variant: PropTypes.string,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  isLoading: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default CustomButton;
