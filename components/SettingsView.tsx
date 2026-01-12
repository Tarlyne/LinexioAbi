import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Download, 
  Upload, 
  Database, 
  Lock, 
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  FileKey,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Save,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { Modal } from './Modal';

export const SettingsView: React.FC = () => {
  const { state, exportState, importState, resetForNewYear, changeMasterPassword, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states for change password
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.lxabi')) {
      setSelectedFile(file);
      setBackupPassword('');
      setShowImportModal(true);
    } else {
      showToast('Ungültiges Dateiformat. Bitte .lxabi nutzen.', 'error');
    }
    e.target.value = '';
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backupPassword.length < 4) {
      showToast('Passwort zu kurz (min. 4 Zeichen).', 'warning');
      return;
    }
    setIsProcessing(true);
    await exportState(backupPassword);
    setIsProcessing(false);
    setShowExportModal(false);
    setBackupPassword('');
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !backupPassword) return;
    
    setIsProcessing(true);
    const success = await importState(selectedFile, backupPassword);
    setIsProcessing(false);
    
    if (success) {
      setShowImportModal(false);
      setSelectedFile(null);
      setBackupPassword('');
    }
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPw || !newPw || !confirmPw) {
      showToast('Bitte alle Felder ausfüllen.', 'warning');
      return;
    }
    if (newPw.length < 4) {
      showToast('Das neue Passwort muss mindestens 4 Zeichen lang sein.', 'warning');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('Die neuen Passwörter stimmen nicht überein.', 'error');
      return;
    }

    setIsProcessing(true);
    const success = await changeMasterPassword(oldPw, newPw);
    setIsProcessing(false);

    if (success) {
      setShowChangePwModal(false);
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } else {
      showToast('Aktuelles Passwort ist nicht korrekt.', 'error');
    }
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
              onClick={() => { setShowExportModal(true); setBackupPassword(''); }}
              className="btn-secondary-glass flex items-center gap-4 p-5 rounded-2xl group text-left border-slate-700/50"
            >
              <div className="w-12 h-12 bg-cyan-600/10 rounded-xl flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-inner">
                <FileKey size={24} />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-200">Backup speichern</span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Separate Passwort-Vergabe</span>
              </div>
              <ChevronRight size={18} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary-glass flex items-center gap-4 p-5 rounded-2xl group text-left border-slate-700/50"
            >
              <div className="w-12 h-12 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shadow-inner">
                <Upload size={24} />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-bold text-slate-200">Backup laden</span>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Datenpaket einspielen</span>
              </div>
              <ChevronRight size={18} className="text-slate-700 group-hover:text-amber-500 transition-colors" />
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
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl shadow-inner">
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

            <button 
              onClick={() => setShowChangePwModal(true)}
              className="w-full flex items-center gap-4 p-4 bg-slate-800/20 border border-slate-700/40 rounded-2xl hover:bg-slate-800/40 hover:border-cyan-500/40 transition-all group text-left"
            >
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 group-hover:rotate-12 transition-transform">
                <RefreshCw size={18} />
              </div>
              <div className="flex-1">
                <span className="block text-xs font-bold text-slate-200">Master-Passwort ändern</span>
                <span className="block text-[9px] text-slate-500 uppercase tracking-widest">Sicherheits-Key neu generieren</span>
              </div>
              <ChevronRight size={16} className="text-slate-700 group-hover:text-cyan-500" />
            </button>
          </div>
        </div>

        {/* Gefahrzone Section */}
        <div className="mt-12 space-y-4">
          <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] ml-4">Gefahrenzone</h3>
          
          <button 
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center gap-6 p-6 bg-red-900/5 border border-red-900/20 rounded-3xl hover:bg-red-900/10 hover:border-red-900/40 transition-all group text-left"
          >
            <div className="w-14 h-14 bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-red-950/20">
              <Database size={28} />
            </div>
            <div className="flex-1">
              <span className="block text-lg font-bold text-slate-200">Neues Prüfungsjahr vorbereiten</span>
              <span className="block text-xs text-slate-500 mt-1">Löscht alle Prüfungsdaten, Schüler und Lehrer für den Neustart.</span>
            </div>
            <ChevronRight size={24} className="text-red-900/40" />
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePwModal} onClose={() => setShowChangePwModal(false)} maxWidth="max-w-md">
        <form onSubmit={handleChangePw} className="flex flex-col space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-700/30">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Passwort ändern</h3>
              <p className="text-xs text-cyan-500/80 font-medium">Sicherheits-Update</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Aktuelles Passwort</label>
              <input 
                type="password"
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
                placeholder="Bisheriges Passwort..."
              />
            </div>

            <div className="pt-2 space-y-4 border-t border-slate-800/50">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Neues Passwort</label>
                <input 
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
                  placeholder="Neues Passwort festlegen..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Neues Passwort bestätigen</label>
                <input 
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
                  placeholder="Wiederholen..."
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={isProcessing}
              className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              Speichern & Neu verschlüsseln
            </button>
            <button 
              type="button"
              onClick={() => setShowChangePwModal(false)}
              className="btn-secondary-glass w-full h-12 rounded-xl"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>

      {/* Export Password Modal */}
      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="max-w-md">
        <form onSubmit={handleExport} className="flex flex-col space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-700/30">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <FileKey size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Backup verschlüsseln</h3>
              <p className="text-xs text-cyan-500/80 font-medium">Sicherer Export für Team-Transfer</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-left space-y-2">
              <div className="flex items-start gap-3">
                <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Dieses Passwort ist unabhängig von deinem Master-Passwort. Deine Kollegen benötigen es zum Einlesen der Datei.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Backup-Passwort festlegen</label>
              <div className="relative">
                <input 
                  autoFocus
                  type="password"
                  value={backupPassword}
                  onChange={e => setBackupPassword(e.target.value)}
                  placeholder="Passwort wählen..."
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-cyan-500/40"
                />
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={isProcessing}
              className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50"
            >
              <Download size={18} /> Backup generieren
            </button>
            <button 
              type="button"
              onClick={() => setShowExportModal(false)}
              className="btn-secondary-glass w-full h-12 rounded-xl"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Password Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setSelectedFile(null); }} maxWidth="max-w-md">
        <form onSubmit={handleImport} className="flex flex-col space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-700/30">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-500">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Backup einspielen</h3>
              <p className="text-xs text-amber-500/80 font-medium">Datei-Entschlüsselung</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-left space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                  Achtung: Durch den Import werden alle aktuell vorhandenen Daten in dieser App unwiderruflich durch den Inhalt des Backups überschrieben!
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
              <FileKey size={16} className="text-amber-500" />
              <div className="truncate text-[11px] font-mono text-slate-300">
                {selectedFile?.name}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Backup-Passwort eingeben</label>
              <div className="relative">
                <input 
                  autoFocus
                  type="password"
                  value={backupPassword}
                  onChange={e => setBackupPassword(e.target.value)}
                  placeholder="Passwort der Datei..."
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-amber-500/40"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              disabled={isProcessing}
              className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}
            >
              Entschlüsseln & Laden
            </button>
            <button 
              type="button"
              onClick={() => { setShowImportModal(false); setSelectedFile(null); }}
              className="btn-secondary-glass w-full h-12 rounded-xl"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>

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
              className="btn-primary-aurora w-full h-14 rounded-xl text-sm uppercase tracking-wider bg-red-600 hover:bg-red-500"
              style={{ 
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.4), inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.3)'
              }}
            >
              Bereinigung jetzt ausführen
            </button>
            <button 
              onClick={() => setShowResetModal(false)}
              className="btn-secondary-glass w-full h-12 rounded-xl"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};