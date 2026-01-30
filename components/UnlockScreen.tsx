import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Lock, ChevronRight, ShieldCheck, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';

export const UnlockScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { unlock, setMasterPassword, requiresSetup } = useAuth();
  const { loadDecryptedData } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setError(null);

    if (requiresSetup) {
      if (password.length < 4) {
        setError('Mindestens 4 Zeichen.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwörter ungleich.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }
      setIsProcessing(true);
      await setMasterPassword(password);
      setIsProcessing(false);
    } else {
      setIsProcessing(true);
      const data = await unlock(password);
      if (data) {
        loadDecryptedData(data);
      } else {
        setError('Ungültiges Passwort');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0f1d]">
      <div className="aurora-container">
        <div className="aurora-glow"></div>
      </div>
      <div
        className={`relative z-10 glass-modal p-8 w-full max-w-md mx-4 ${isShaking ? 'animate-shake' : ''}`}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            {requiresSetup ? <ShieldCheck size={32} /> : <Lock size={32} />}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">LinexioAbi</h1>
            <p className="text-slate-400 text-sm mt-1">
              {requiresSetup ? 'Sicherheits-Setup' : 'Identität bestätigen'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <input
                autoFocus
                type={showPassword ? 'text' : 'password'}
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-white outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff size={18} className="text-slate-200" />
                ) : (
                  <Eye size={18} className="text-slate-200" />
                )}
              </button>
            </div>
            {requiresSetup && (
              <>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 pr-12 text-white outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} className="text-slate-200" />
                    ) : (
                      <Eye size={18} className="text-slate-200" />
                    )}
                  </button>
                </div>

                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex gap-3 animate-in fade-in duration-700 slide-in-from-top-1">
                  <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-indigo-300 font-bold">Wichtig:</span> Bitte merke dir
                    dieses Passwort gut. Da alle Daten lokal verschlüsselt werden, haben wir keinen
                    Zugriff darauf und es gibt keine "Passwort vergessen"-Funktion.
                  </p>
                </div>
              </>
            )}
            <button
              disabled={isProcessing}
              className="btn-aurora-base btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase font-black shadow-lg"
            >
              {isProcessing ? 'Verarbeite...' : requiresSetup ? 'Einrichten' : 'Entsperren'}{' '}
              <ChevronRight size={20} />
            </button>
            {error && (
              <div className="text-red-400 text-xs text-center font-bold flex items-center justify-center gap-2 pt-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
