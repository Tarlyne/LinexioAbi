import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';
import { Modal } from './Modal';

export const AutoLockWarningModal: React.FC = () => {
  const { isLockWarningVisible, lockCountdown, extendSession, lock } = useAuth();

  return (
    <Modal isOpen={isLockWarningVisible} onClose={() => {}} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <div className="relative">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)] animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-black text-xs border-2 border-slate-900">
            {lockCountdown}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">Sitzung läuft ab</h3>
          <p className="text-sm text-slate-400">
            Aufgrund von Inaktivität wird das System in Kürze automatisch gesperrt.
          </p>
        </div>

        <div className="w-full bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-center gap-4">
          <Clock size={16} className="text-amber-500" />
          <span className="text-sm font-black text-white uppercase tracking-widest">
            Sperrung in {lockCountdown}s
          </span>
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={extendSession}
            className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider"
          >
            Angemeldet bleiben
          </button>
          <button
            onClick={lock}
            className="text-slate-500 hover:text-red-400 text-xs font-bold uppercase py-2"
          >
            <LogOut size={14} className="inline mr-2" /> Jetzt sperren
          </button>
        </div>
      </div>
    </Modal>
  );
};
