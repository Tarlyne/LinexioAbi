
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ChevronRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const UnlockScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { unlock, setMasterPassword, state } = useApp();

  const isInitialSetup = !state.masterPassword || state.masterPassword === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isInitialSetup) {
      if (password.length < 4) {
        setError('Das Passwort muss mindestens 4 Zeichen lang sein.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Die Passwörter stimmen nicht überein.');
        return;
      }
      await setMasterPassword(password);
    } else {
      const success = await unlock(password);
      if (!success) {
        setError('Ungültiges Passwort');
        const el = document.getElementById('unlock-card');
        el?.classList.add('translate-x-2');
        setTimeout(() => el?.classList.remove('translate-x-2'), 500);
      }
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0f1d]">
      <div className="aurora-container">
        <div className="aurora-glow" style={{ top: '10%', left: '10%' }}></div>
        <div className="aurora-glow" style={{ bottom: '10%', right: '10%', animationDelay: '-5s', scale: '1.2' }}></div>
      </div>

      <div 
        id="unlock-card"
        className="relative z-10 glass-modal p-8 w-full max-w-md mx-4 transition-all duration-300"
      >
        <div className="flex flex-col items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg transition-all duration-500 ${
            isInitialSetup 
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-900/20' 
            : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-cyan-900/20'
          }`}>
            {isInitialSetup ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">LinexioAbi</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isInitialSetup ? 'Sicherheits-Setup: Master-Passwort festlegen' : 'Identität bestätigen'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <input
                  autoFocus
                  type="password"
                  placeholder={isInitialSetup ? "Neues Passwort..." : "Passwort eingeben..."}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/40 transition-all shadow-inner"
                />
                {!isInitialSetup && (
                  <button 
                    type="submit"
                    className="absolute right-2 top-1.5 bottom-1.5 w-10 btn-primary-aurora rounded-lg shadow-lg"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>

              {isInitialSetup && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <input
                    type="password"
                    placeholder="Passwort bestätigen..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/40 transition-all shadow-inner"
                  />
                  <button 
                    type="submit"
                    className="btn-primary-aurora w-full mt-4 h-12 rounded-xl text-sm uppercase tracking-wider"
                    style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}
                  >
                    Einrichtung abschließen <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 animate-pulse">
                <AlertCircle size={14} />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}
          </form>

          <div className="pt-4 border-t border-slate-700/30 w-full text-center">
             {isInitialSetup ? (
               <p className="text-[9px] text-slate-500 leading-relaxed max-w-[200px] mx-auto italic">
                 Dieses Passwort verschlüsselt deine Daten lokal auf diesem Gerät. Verliere es nicht!
               </p>
             ) : (
               <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                 Secure Environment • V1.2
               </p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
