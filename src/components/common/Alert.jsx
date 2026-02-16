const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null; // // Si no hay mensaje, no renderiza

  return (
    <div className={`alert alert-${type} d-flex justify-content-between align-items-center`} role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="btn btn-sm btn-outline-dark" onClick={onClose}>
          X
        </button>
      )}
    </div>
  );
};

export default Alert;
