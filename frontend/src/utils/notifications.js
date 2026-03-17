import Swal from 'sweetalert2';

const variantMap = {
  danger: {
    icon: 'warning',
    confirmText: 'Si, continuar',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-danger'
  },
  delete: {
    icon: 'warning',
    confirmText: 'Si, eliminar',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-danger'
  },
  cancel: {
    icon: 'question',
    confirmText: 'Si, anular',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-cancel'
  },
  convert: {
    icon: 'info',
    confirmText: 'Si, convertir',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-convert'
  },
  deactivate: {
    icon: 'warning',
    confirmText: 'Si, desactivar',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-deactivate'
  },
  restore: {
    icon: 'success',
    confirmText: 'Si, restablecer',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-restore'
  },
  stock: {
    icon: 'question',
    confirmText: 'Si, agregar',
    confirmClass: 'jyr-swal-confirm jyr-swal-confirm-stock'
  }
};

const baseOptions = {
  customClass: {
    popup: 'jyr-swal-popup',
    title: 'jyr-swal-title',
    htmlContainer: 'jyr-swal-text',
    confirmButton: 'jyr-swal-confirm',
    cancelButton: 'jyr-swal-cancel'
  },
  showClass: {
    popup: 'jyr-swal-in',
    backdrop: 'jyr-swal-backdrop-in'
  },
  hideClass: {
    popup: 'jyr-swal-out',
    backdrop: 'jyr-swal-backdrop-out'
  },
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
};

export const confirmDialog = async ({
  variant = 'danger',
  title = 'Confirmar accion',
  text = '',
  icon,
  confirmText,
  cancelText = 'Cancelar'
} = {}) => {
  const selectedVariant = variantMap[variant] || variantMap.danger;

  const result = await Swal.fire({
    ...baseOptions,
    icon: icon || selectedVariant.icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText || selectedVariant.confirmText,
    cancelButtonText: cancelText,
    customClass: {
      ...baseOptions.customClass,
      confirmButton: selectedVariant.confirmClass,
      cancelButton: 'jyr-swal-cancel'
    }
  });

  return result.isConfirmed;
};

export const alertDialog = async ({
  title = 'Aviso',
  text = '',
  icon = 'info',
  confirmText = 'Entendido'
} = {}) => {
  await Swal.fire({
    ...baseOptions,
    icon,
    title,
    text,
    showCancelButton: false,
    confirmButtonText: confirmText
  });
};
