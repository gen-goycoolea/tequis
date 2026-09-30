import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-500 shrink-0" />,
  error:   <XCircle size={18} className="text-rose-500 shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-500 shrink-0" />,
  info:    <Info size={18} className="text-blue-500 shrink-0" />,
};

const BG = {
  success: 'bg-white dark:bg-gray-800 border-emerald-400',
  error:   'bg-white dark:bg-gray-800 border-rose-400',
  warning: 'bg-white dark:bg-gray-800 border-amber-400',
  info:    'bg-white dark:bg-gray-800 border-blue-400',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-2xl border-l-4 shadow-xl pointer-events-auto
              text-gray-800 dark:text-gray-100 text-sm font-medium
              animate-[slideIn_0.25s_ease-out]
              ${BG[t.type] || BG.info}`}
          >
            {ICONS[t.type] || ICONS.info}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-0.5 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
