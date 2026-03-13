import React, { createContext, useContext, useMemo, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmDialogContext = createContext(null);

export const ConfirmDialogProvider = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    tone: 'primary',
    resolver: null,
  });

  const confirm = ({
    title = 'Confirmar acción',
    message = '¿Desea continuar?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    tone = 'primary',
  } = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title,
        message,
        confirmText,
        cancelText,
        tone,
        resolver: resolve,
      });
    });
  };

  const close = (result) => {
    if (typeof state.resolver === 'function') {
      state.resolver(result);
    }
    setState((prev) => ({ ...prev, open: false, resolver: null }));
  };

  const value = useMemo(() => ({ confirm }), []);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}

      {state.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20000,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => close(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--jyr-gray-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiAlertTriangle size={18} color={state.tone === 'danger' ? '#dc2626' : '#2563eb'} />
              <h5 style={{ margin: 0, fontWeight: 700 }}>{state.title}</h5>
            </div>

            <div style={{ padding: '16px 18px', color: 'var(--jyr-gray-700)', lineHeight: 1.5 }}>
              {state.message}
            </div>

            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid var(--jyr-gray-200)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button className="jyr-btn jyr-btn-sm jyr-btn-outline" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button
                className={`jyr-btn jyr-btn-sm ${state.tone === 'danger' ? 'jyr-btn-danger' : 'jyr-btn-primary'}`}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de ConfirmDialogProvider');
  }
  return ctx.confirm;
};
