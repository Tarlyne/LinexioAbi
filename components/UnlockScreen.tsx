import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ChevronRight } from 'lucide-react';

export const UnlockScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { unlock, state } = useApp();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const success = unlock(password);
    if (!success) {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  const isInitialSetup = !state.masterPassword;

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0f1d]">
      <div className="aurora-container">
        <div className="aurora-glow" style={{ top: '10%', left: '10%' }}></div>
        <div className="aurora-glow" style={{ bottom: '10%', right: '10%', animationDelay: '-5s', scale: '1.2' }}></div>
      </div>

      <div className={`relative z-10 glass-modal p-8 w-full max-w-md mx-4 transition-all duration-300 ${error ? 'translate-x-2' : ''}`}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Lock className="text-cyan-400 w-8 h-8" />
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">LinexioAbi</h1>
            <p className="text-slate-400 text-sm mt-1">
              {isInitialSetup ? 'Initiales Master-Passwort festlegen' : 'Identität bestätigen'}
            </p>
          </div>

          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div className="relative">
              <input
                autoFocus
                type="password"
                placeholder="Passwort..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-cyan-500/40 transition-all"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            
            {error && <p className="text-xs text-red-400 text-center animate-pulse">Ungültiges Passwort</p>}
          </form>

          <div className="pt-4 border-t border-slate-700/30 w-full">
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">
              Secure Environment • V1.1
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};