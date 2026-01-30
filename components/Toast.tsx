import React from 'react';
import { useUI, ToastType } from '../context/UIContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Portal } from './Portal';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useUI();

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'amber':
        return <AlertTriangle size={16} className="text-amber-400" />;
      default:
        return <Info size={16} className="text-cyan-400" />;
    }
  };

  const getColorClass = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10 shadow-emerald-900/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10 shadow-red-900/10';
      case 'warning':
        return 'border-red-500/30 bg-red-500/10 shadow-red-900/10';
      case 'amber':
        return 'border-amber-500/30 bg-amber-500/10 shadow-amber-900/10';
      default:
        return 'border-cyan-500/30 bg-cyan-500/10 shadow-cyan-900/10';
    }
  };

  return (
    <Portal>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl
              animate-in fade-in slide-in-from-bottom-4 duration-300
              ${getColorClass(toast.type)}
            `}
          >
            {getIcon(toast.type)}
            <span className="text-sm font-medium text-slate-200">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-500"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Portal>
  );
};
