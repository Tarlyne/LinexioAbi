
import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Download, 
  Upload, 
  Database, 
  Lock, 
  ChevronRight,
  AlertCircle,
  FileKey,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Modal } from './Modal';

export const SettingsView: React.FC = () => {
  const { state, exportState, importState, resetForNewYear, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.lxabi')) {
      if (window.confirm("Achtung: Das Einspielen eines Backups überschreibt alle aktuellen Daten. Fortfahren?")) {
        await importState(file);
      }
    } else {
      showToast('Ungültiges Dateiformat. Bitte .lxabi nutzen.', 'error');
    }
    e.target.value = '';
  };

  const confirmReset = () => {
    resetForNewYear();
    setShowResetModal(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 w-full relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Einstellungen</h2>
          <p className="text-cyan-500/80 text-xs font-medium">Systemverwaltung & Datensicherheit</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar space-y-6 pb-10">
        
        {/* Datensicherung Section */}
        <div className="glass-nocturne border border-slate-700/30 overflow-hidden">
          <div className="p-6 border-b border-slate-700/30 bg-slate-900/40 flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daten & Backup</h3>
              <p className="text-[10px] text-slate-500">AES-256 verschlüsselte Dateisicherung</p>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={exportState}
              className="flex items-center gap-4 p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl hover:border-cyan-500/40 hover:bg-slate-800/40 transition-all group text-left"
            >
              <div className="w-12 h-12 bg-cyan-600/10 rounded-xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <FileKey size={24} />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-200">Backup speichern</span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Verschlüsselt (.lxabi)</span>
              </div>
              <ChevronRight size={18} className="ml-auto text-slate-700 group-hover:text-cyan-500 transition-colors" />
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 p-4 bg-slate-800/20 border border-slate-700/50 rounded-2xl hover:border-amber-500/40 hover:bg-slate-800/40 transition-all group text-left"
            >
              <div className="w-12 h-12 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-200">Backup laden</span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Vorhandene .lxabi Datei</span>
              </div>
              <ChevronRight size={18} className="ml-auto text-slate-700 group-hover:text-amber-500 transition-colors" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".lxabi" 
              onChange={onFileChange} 
            />
          </div>
        </div>

        {/* Sicherheit Status */}
        <div className="glass-nocturne border border-slate-700/30 overflow-hidden">
          <div className="p-6 border-b border-slate-700/30 bg-slate-900/40 flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-700/20 rounded-xl flex items-center justify-center border border-cyan-700/30 text-cyan-500">
              <Lock size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Verschlüsselung</h3>
              <p className="text-[10px] text-slate-500">Status der Zugangskontrolle</p>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${state.masterPassword ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                <div>
                  <span className="block text-xs font-bold text-slate-200">System-Schutz</span>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-widest">{state.masterPassword ? 'AES-GCM aktiv' : 'Kein Passwort'}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 font-mono italic">
                {state.masterPassword ? 'Verschlüsselt' : 'Ungeschützt'}
              </div>
            </div>
          </div>
        </div>

        {/* Gefahrzone Section */}
        <div className="mt-12 space-y-4">
          <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] ml-4">Gefahrenzone</h3>
          
          <button 
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center gap-6 p-6 bg-slate-900/40 border border-red-900/20 rounded-3xl hover:bg-red-900/10 hover:border-red-900/40 transition-all group text-left"
          >
            <div className="w-14 h-14 bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0 group-hover:scale-110 transition-transform">
              <Database size={28} />
            </div>
            <div>
              <span className="block text-lg font-bold text-slate-200">Neues Prüfungsjahr vorbereiten</span>
              <span className="block text-xs text-slate-500 mt-1">Löscht alle Prüfungsdaten, Schüler und Lehrer für den Neustart.</span>
            </div>
            <ChevronRight size={24} className="ml-auto text-red-900/40" />
          </button>
        </div>
      </div>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-900/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <AlertCircle size={32} />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Neues Jahr vorbereiten?
            </h3>
            <p className="text-sm text-slate-400 mt-2">Diese Aktion bereinigt die Datenbank für den nächsten Abitur-Jahrgang.</p>
          </div>

          <div className="w-full space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 text-left">
             <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Auswirkungen:</div>
             
             <div className="space-y-2">
               <div className="flex items-center gap-2 text-[11px] text-red-400"><XCircle size={14} /> Prüfungsplan & Aufsichtsplan</div>
               <div className="flex items-center gap-2 text-[11px] text-red-400"><XCircle size={14} /> Schülerliste & Räume</div>
               <div className="flex items-center gap-2 text-[11px] text-red-400"><XCircle size={14} /> Prüfungstage & Lehrkräfte</div>
               <div className="flex items-center gap-2 text-[11px] text-emerald-500"><CheckCircle2 size={14} /> Fachkatalog bleibt erhalten</div>
               <div className="flex items-center gap-2 text-[11px] text-emerald-500"><CheckCircle2 size={14} /> Master-Passwort bleibt erhalten</div>
             </div>
          </div>

          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={confirmReset}
              className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all active:scale-95"
            >
              Bereinigung jetzt ausführen
            </button>
            <button 
              onClick={() => setShowResetModal(false)}
              className="w-full h-12 text-slate-400 hover:text-white font-medium transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
