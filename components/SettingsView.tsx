import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { 
  Upload, Database, Lock, ChevronRight, AlertCircle, FileKey, Clock, ShieldCheck, KeyRound, Save, AlertTriangle, CheckCircle2, Trash2,
  RefreshCw, Loader2, X, ChevronDown
} from 'lucide-react';
import { Modal } from './Modal';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, changeMasterPassword } = useAuth();
  const { exportState, importState, resetForNewYear, exams, supervisions, collectedExamIds } = useApp();
  const { showToast } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [isStoragePersistent, setIsStoragePersistent] = useState<boolean | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => setIsStoragePersistent(p));
    }
  }, []);

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { showToast('Passwörter ungleich', 'error'); return; }
    setIsProcessing(true);
    const success = await changeMasterPassword(oldPw, newPw, { exams, supervisions, collectedExamIds });
    setIsProcessing(false);
    if (success) {
      setShowChangePwModal(false);
      showToast('Passwort erfolgreich geändert', 'success');
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } else showToast('Aktuelles Passwort falsch', 'error');
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupPassword) { showToast('Bitte Passwort vergeben', 'warning'); return; }
    if (backupPassword !== confirmBackupPassword) { showToast('Die Passwörter stimmen nicht überein', 'error'); return; }
    
    setIsProcessing(true);
    await exportState(backupPassword);
    setIsProcessing(false);
    setShowExportModal(false);
    setBackupPassword('');
    setConfirmBackupPassword('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500 w-full relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Einstellungen</h2>
          <p className="text-cyan-500/80 text-[10px] font-bold tracking-wide mt-0.5">Systemverwaltung & Datensicherheit</p>
        </div>
        
        {isStoragePersistent !== null && (
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-all ${
            isStoragePersistent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {isStoragePersistent ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase leading-none mb-0.5">Datenbank-Status</span>
               <span className="text-xs font-bold">{isStoragePersistent ? 'Persistent (Sicher)' : 'Temporär'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2 no-scrollbar pb-10">
        {/* Main Sections Grid: Enforces same height on tablet/desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 auto-rows-fr">
          
          {/* Sektion 1: Datensicherung */}
          <div className="glass-nocturne border border-slate-700/30 overflow-hidden relative group flex flex-col h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 opacity-50"></div>
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3 shrink-0">
                <Database size={16} className="text-cyan-400" /> Datensicherung
              </h3>
              <div className="flex-1 flex flex-col gap-4">
                {/* 3-Column Layout for Export Card */}
                <button 
                  onClick={() => setShowExportModal(true)} 
                  className="btn-secondary-glass p-4 rounded-2xl text-left border-slate-700/50 hover:bg-slate-800/40 group/btn grid grid-cols-[40px_1fr_40px] items-center gap-4 transition-all"
                >
                  <div className="flex items-center justify-center">
                    <FileKey size={24} className="text-cyan-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-white leading-tight truncate">Backup exportieren</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-medium leading-snug">Verschlüsselte .lxabi Datei erstellen</span>
                  </div>
                  <div className="flex items-center justify-center opacity-20 group-hover/btn:opacity-40 transition-all group-hover/btn:scale-110">
                    <FileKey size={28} className="text-slate-500" />
                  </div>
                </button>

                {/* 3-Column Layout for Import Card */}
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="btn-secondary-glass p-4 rounded-2xl text-left border-slate-700/50 hover:bg-slate-800/40 group/btn grid grid-cols-[40px_1fr_40px] items-center gap-4 transition-all"
                >
                  <div className="flex items-center justify-center">
                    <Upload size={24} className="text-amber-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-white leading-tight truncate">Backup importieren</span>
                    <span className="text-[10px] text-slate-500 mt-1 font-medium leading-snug">Bestehende Daten überschreiben</span>
                  </div>
                  <div className="flex items-center justify-center opacity-20 group-hover/btn:opacity-40 transition-all group-hover/btn:scale-110">
                    <Upload size={28} className="text-slate-500" />
                  </div>
                </button>
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".lxabi" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setSelectedFile(f); setShowImportModal(true); }
                }} />
              </div>
            </div>
          </div>

          {/* Sektion 2: Sicherheit & Privatsphäre */}
          <div className="glass-nocturne border border-slate-700/30 overflow-hidden relative flex flex-col h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50"></div>
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3 shrink-0">
                <Lock size={16} className="text-indigo-400" /> Sicherheit & Privatsphäre
              </h3>
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-800/50 shadow-inner shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                      <Clock size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white leading-none">Auto-Lock Timer</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Sperre</span>
                    </div>
                  </div>
                  <div className="relative group">
                    <select 
                      value={settings.autoLockMinutes} 
                      onChange={e => updateSettings({ autoLockMinutes: parseInt(e.target.value) })} 
                      className="appearance-none bg-slate-950 text-xs font-bold text-white border border-slate-800 rounded-xl pl-3 pr-8 py-2 outline-none focus:ring-1 focus:ring-cyan-500/40 cursor-pointer"
                    >
                      <option value={5}>5 Min</option>
                      <option value={10}>10 Min</option>
                      <option value={30}>30 Min</option>
                      <option value={0}>Aus</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600" size={14} />
                  </div>
                </div>

                <button onClick={() => setShowChangePwModal(true)} className="btn-secondary-glass p-4 rounded-2xl border-slate-700/50 flex items-center justify-between group flex-1">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                      <KeyRound size={20} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-white leading-none">Master-Passwort</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ändern</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-all" />
                </button>
              </div>
            </div>
          </div>

          {/* Sektion 3: Gefahrenzone */}
          <div className="glass-nocturne border border-red-500/20 bg-red-950/5 overflow-hidden relative flex flex-col h-full">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-50"></div>
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12">
              <ShieldCheck size={120} className="text-red-500" />
            </div>
            
            <div className="p-6 flex flex-col h-full z-10">
              <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 shrink-0">
                <AlertTriangle size={16} /> Gefahrenzone
              </h3>
              
              <div className="flex-1 flex flex-col justify-center items-center gap-6">
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-black text-white tracking-tight">Systembereinigung</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                    Daten für ein neues Schuljahr zurücksetzen. Fächer & Master-Passwort bleiben erhalten.
                  </p>
                </div>
                {/* Vertically centered button */}
                <button 
                  onClick={() => setShowResetModal(true)} 
                  className="btn-aurora-base btn-danger-aurora px-8 py-4 rounded-2xl text-sm"
                >
                  <RefreshCw size={18} /> <span>Zurücksetzen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} maxWidth="max-w-lg">
         <div className="flex flex-col items-center text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
               <ShieldCheck size={44} />
            </div>
            
            <div className="space-y-2">
               <h3 className="text-2xl font-black text-white tracking-tight">Vorsicht: Daten-Reset</h3>
               <p className="text-sm text-slate-400">Möchtest du die Datenbank wirklich für ein neues Jahr vorbereiten?</p>
            </div>

            <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800 p-5 text-left space-y-4 shadow-inner">
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Was gelöscht wird:</div>
               <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Lehrkräfte', count: 'Alle' },
                    { label: 'Prüfungsplan', count: exams.length },
                    { label: 'Aufsichtsplan', count: supervisions.length },
                    { label: 'Räume & Tage', count: 'Alle' },
                    { label: 'Protokoll-Logs', count: collectedExamIds.length },
                    { label: 'Schüler-Liste', count: 'Alle' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-red-400/80">
                      <Trash2 size={12} />
                      <span className="text-[11px] font-bold">{item.label}</span>
                      <span className="text-[10px] bg-red-500/10 px-1.5 rounded ml-auto">{item.count}</span>
                    </div>
                  ))}
               </div>
               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pt-2 pb-2">Was erhalten bleibt:</div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-emerald-400/80">
                    <CheckCircle2 size={12} />
                    <span className="text-[11px] font-bold">Fächer-Katalog</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400/80">
                    <CheckCircle2 size={12} />
                    <span className="text-[11px] font-bold">Master-Passwort</span>
                  </div>
               </div>
            </div>

            <div className="w-full flex flex-col gap-3">
               <button 
                 onClick={() => { resetForNewYear(); setShowResetModal(false); }} 
                 className="btn-aurora-base btn-danger-aurora w-full h-14 rounded-2xl text-sm uppercase tracking-widest"
               >
                 Jetzt zurücksetzen
               </button>
               <button onClick={() => setShowResetModal(false)} className="text-slate-500 hover:text-white text-xs font-bold uppercase py-2 transition-colors">
                  Vorgang abbrechen
               </button>
            </div>
         </div>
      </Modal>

      <Modal isOpen={showChangePwModal} onClose={() => setShowChangePwModal(false)} maxWidth="max-w-md">
         <form onSubmit={handleChangePw} className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                     <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Passwort ändern</h3>
                    <p className="text-[10px] text-indigo-500/80 font-black uppercase tracking-[0.15em]">Sicherheitseinstellungen</p>
                  </div>
               </div>
               <button type="button" onClick={() => setShowChangePwModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
              Das Master-Passwort schützt den Zugriff auf die gesamte LinexioAbi Datenbank. 
              <strong> Wichtig:</strong> Ein verlorenes Passwort kann aus Sicherheitsgründen nicht wiederhergestellt werden.
            </p>

            <div className="space-y-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Aktuelles Passwort</label>
                  <input 
                    autoFocus
                    type="password" 
                    placeholder="Aktuelles Passwort eingeben" 
                    value={oldPw} 
                    onChange={e => setOldPw(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-indigo-500/40" 
                  />
               </div>
               <div className="h-px bg-slate-800/50 my-2"></div>
               <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Neues Master-Passwort</label>
                  <input 
                    type="password" 
                    placeholder="Neues Passwort wählen" 
                    value={newPw} 
                    onChange={e => setNewPw(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-emerald-500/40" 
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Passwort bestätigen</label>
                  <input 
                    type="password" 
                    placeholder="Passwort wiederholen" 
                    value={confirmPw} 
                    onChange={e => setConfirmPw(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-emerald-500/40" 
                  />
               </div>
            </div>
            
            <button disabled={isProcessing || !oldPw || !newPw || !confirmPw} className="btn-aurora-base btn-indigo-aurora w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-30">
               {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               <span>{isProcessing ? 'Speichere' : 'Neues Passwort'}</span>
            </button>
         </form>
      </Modal>

      <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="max-w-md">
        <form onSubmit={handleExport} className="space-y-6">
           <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
                  <FileKey size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Export verschlüsseln</h3>
                  <p className="text-[10px] text-cyan-500/80 font-black uppercase tracking-[0.15em]">Datensicherung</p>
                </div>
             </div>
             <button type="button" onClick={() => setShowExportModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
               <X size={20} />
             </button>
           </div>
           
           <p className="text-xs text-slate-400 leading-relaxed bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/10">
             Vergebe ein Passwort für die Backup-Datei. Dieses wird beim Import erneut abgefragt. 
             <strong> Tipp:</strong> Das Passwort muss nicht identisch mit dem Master-Passwort sein.
           </p>
           
           <div className="space-y-4">
             <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Sicherheits-Passwort</label>
               <input 
                 autoFocus
                 type="password" 
                 value={backupPassword} 
                 onChange={e => setBackupPassword(e.target.value)} 
                 className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-cyan-500/40" 
                 placeholder="Passwort für diese Datei" 
               />
             </div>
             <div className="space-y-1.5">
               <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Passwort wiederholen</label>
               <input 
                 type="password" 
                 value={confirmBackupPassword} 
                 onChange={e => setConfirmBackupPassword(e.target.value)} 
                 className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-cyan-500/40" 
                 placeholder="Passwort erneut eingeben" 
               />
             </div>
           </div>
           
           <button disabled={isProcessing || !backupPassword || !confirmBackupPassword} className="btn-aurora-base btn-primary-aurora w-full h-14 rounded-2xl font-black uppercase tracking-widest disabled:opacity-30">
             {isProcessing ? <Loader2 className="animate-spin" /> : 'Backup generieren'}
           </button>
        </form>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} maxWidth="max-w-md">
        <form onSubmit={async e => { e.preventDefault(); setIsProcessing(true); const ok = await importState(selectedFile!, backupPassword); setIsProcessing(false); if(ok) setShowImportModal(false); }} className="space-y-6">
           <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-400">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Backup einspielen</h3>
                  <p className="text-[10px] text-amber-500/80 font-black uppercase tracking-[0.15em]">Daten wiederherstellen</p>
                </div>
             </div>
             <button type="button" onClick={() => setShowImportModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
               <X size={20} />
             </button>
           </div>

           <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
              <AlertTriangle size={20} className="shrink-0" />
              <p className="text-[11px] font-bold leading-relaxed uppercase">Achtung: Dieser Vorgang löscht alle aktuellen Daten unwiderruflich und ersetzt sie durch das Backup!</p>
           </div>
           <input 
             autoFocus
             type="password" 
             value={backupPassword} 
             onChange={e => setBackupPassword(e.target.value)} 
             className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:ring-1 focus:ring-amber-500/40" 
             placeholder="Datei-Passwort eingeben" 
           />
           <button disabled={isProcessing || !backupPassword} className="btn-aurora-base btn-warning-aurora w-full h-14 rounded-black font-black uppercase tracking-widest disabled:opacity-30">
             {isProcessing ? <Loader2 className="animate-spin" /> : 'Entschlüsseln & Laden'}
           </button>
        </form>
      </Modal>
    </div>
  );
};
