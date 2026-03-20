import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
import { minToTime, examSlotToMin } from '../../utils/TimeService';
import {
  X,
  Printer,
  FileText,
  FileCheck,
  Loader2,
  Download,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { PdfExportService } from '../../services/PdfExportService';
import { runPreflightCheck } from '../../utils/validationEngine';
import { ExportPrintView } from '../ExportPrintView';
import { PrepRoomPrintView } from '../PrepRoomPrintView';
import { BeisitzerPrintView } from './BeisitzerPrintView';
import { useUI } from '../../context/UIContext';
import { AppState } from '../../types';

interface PlanningExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDayIdx: number;
  appState: AppState;
}

export const PlanningExportModal: React.FC<PlanningExportModalProps> = ({
  isOpen,
  onClose,
  activeDayIdx,
  appState,
}) => {
  const { showToast } = useUI();
  const [exportType, setExportType] = useState<'exam' | 'prep' | 'beisitzer' | 'protocol'>('exam');
  const [isExporting, setIsExporting] = useState(false);
  const [protocolPoints, setProtocolPoints] = useState<Record<string, { achieved: string; required: string }>>({});

  const preflightIssues = useMemo(() => {
    return runPreflightCheck(appState, activeDayIdx);
  }, [appState, activeDayIdx]);

  const formattedDayInfo = useMemo(() => {
    const day = appState.days[activeDayIdx];
    if (!day) return '';
    const dateStr = new Date(day.date).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${day.label} (${dateStr})`;
  }, [appState.days, activeDayIdx]);

  const handleExport = async () => {
    setIsExporting(true);
    const dayLabel = appState.days[activeDayIdx]?.label || 'Prüfungsplan';
    const prefixes = { exam: 'Pruefungsplan', prep: 'Vorbereitungsplan', beisitzer: 'Beisitzerliste', protocol: 'Protokolle' };
    const prefix = prefixes[exportType];
    const filename = `${prefix}_${dayLabel.replace(/\s/g, '_')}`;

    try {
      if (exportType === 'exam') {
        await PdfExportService.generateAndDownload(appState, activeDayIdx, filename);
      } else if (exportType === 'prep') {
        await PdfExportService.generatePrepRoomPdf(appState, activeDayIdx, filename);
      } else if (exportType === 'beisitzer') {
        await PdfExportService.generateBeisitzerPdf(appState, activeDayIdx, filename);
      } else if (exportType === 'protocol') {
        let logoBase64 = '';
        try {
          const baseUrl = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL 
            ? import.meta.env.BASE_URL 
            : '/';
          const response = await fetch(`${baseUrl}Facettenkreuz.jpg`);
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('image')) {
              const blob = await response.blob();
              logoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } else {
              console.warn('Datei gefunden, ist aber kein Bild (evtl. index.html Fallback). Typ:', contentType);
            }
          }
        } catch (e) {
          console.warn('Logo konnte nicht geladen werden', e);
        }
        await PdfExportService.generateProtocolPdf(appState, activeDayIdx, filename, protocolPoints, logoBase64);
      }
      showToast('PDF erfolgreich generiert.', 'success');
    } catch (err) {
      showToast('PDF-Export fehlgeschlagen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-[1200px]">
      <div className="flex flex-col gap-6 h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              {exportType === 'exam' ? <FileText size={20} /> : <FileCheck size={20} />}
            </div>
            <div className="w-[420px] shrink-0">
              <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
              <p className="text-xs text-cyan-500/80 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {exportType === 'exam' ? 'Prüfungsplan' : exportType === 'prep' ? 'Vorbereitungsplan' : exportType === 'beisitzer' ? 'Beisitzerliste' : 'Protokolle'} für{' '}
                {formattedDayInfo}
              </p>
            </div>
          </div>

          <div className="segmented-control-wrapper w-[420px] h-9">
            <div
              className="segmented-control-slider"
              style={{
                width: 'calc((100% - 8px) / 4)',
                transform: `translateX(calc(${exportType === 'exam' ? 0 : exportType === 'prep' ? 1 : exportType === 'beisitzer' ? 2 : 3} * 100%))`,
              }}
            />
            <button
              onClick={() => setExportType('exam')}
              className={`segmented-control-item ${exportType === 'exam' ? 'text-white' : 'text-slate-500'}`}
            >
              Prüfungen
            </button>
            <button
              onClick={() => setExportType('prep')}
              className={`segmented-control-item ${exportType === 'prep' ? 'text-white' : 'text-slate-500'}`}
            >
              Vorbereitung
            </button>
            <button
              onClick={() => setExportType('beisitzer')}
              className={`segmented-control-item ${exportType === 'beisitzer' ? 'text-white' : 'text-slate-500'}`}
            >
              Beisitzer
            </button>
            <button
              onClick={() => setExportType('protocol')}
              className={`segmented-control-item ${exportType === 'protocol' ? 'text-white' : 'text-slate-500'}`}
            >
              Protokolle
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary-aurora px-6 py-2.5 rounded-xl text-sm disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {isExporting ? 'Generiere...' : 'PDF speichern'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          <div className="w-72 flex flex-col gap-4 overflow-y-auto no-scrollbar pr-2 shrink-0">
            <div className="glass-nocturne p-5 border border-slate-700/30 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-700/30 pb-3">
                <ShieldAlert size={18} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Planungs-Check
                </h4>
              </div>
              <div className="space-y-3">
                {preflightIssues.length === 0 ? (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300">
                      Keine Probleme gefunden. Der Plan ist bereit für den Export.
                    </p>
                  </div>
                ) : (
                  preflightIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 ${issue.severity === 'error'
                        ? 'bg-red-500/5 border-red-500/20'
                        : issue.severity === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : 'bg-cyan-500/5 border-cyan-500/20'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {issue.severity === 'error' ? (
                          <AlertCircle size={14} className="text-red-500" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle size={14} className="text-amber-500" />
                        ) : (
                          <Info size={14} className="text-cyan-400" />
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase tracking-tight ${issue.severity === 'error'
                            ? 'text-red-400'
                            : issue.severity === 'warning'
                              ? 'text-amber-400'
                              : 'text-cyan-300'
                            }`}
                        >
                          {issue.message}
                        </span>
                      </div>
                      {issue.details && (
                        <p className="text-[10px] text-slate-400 leading-tight pl-5 italic">
                          {issue.details}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-950/40 rounded-2xl p-6 border border-slate-700/30 shadow-inner no-scrollbar text-black">
            <div className="mx-auto origin-top transition-transform duration-300">
              {exportType === 'exam' ? (
                <ExportPrintView activeDayIdx={activeDayIdx} isPreview={true} />
              ) : exportType === 'prep' ? (
                <PrepRoomPrintView activeDayIdx={activeDayIdx} isPreview={true} />
              ) : exportType === 'beisitzer' ? (
                <BeisitzerPrintView activeDayIdx={activeDayIdx} isPreview={true} />
              ) : (
                <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-700/30 text-white shadow-inner">
                  <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Punkte-Erfassung für Protokolle</h2>
                  <p className="text-sm text-slate-400 mb-6 font-medium">Bitte ergänze hier die <em className="text-cyan-400/80">erreichten</em> und <em className="text-cyan-400/80">benötigten</em> Punkte für die Prüfungen. Diese Werte werden beim PDF-Export direkt in die Protokolle gedruckt (als Blanko-Seiten).</p>
                  
                  <div className="space-y-3">
                    {appState.exams
                      .filter(e => e.startTime > 0 && Math.floor((e.startTime - 1) / 1000) === activeDayIdx && e.status !== 'cancelled')
                      .sort((a, b) => a.startTime - b.startTime)
                      .map((exam) => {
                        const student = appState.students.find(s => s.id === exam.studentId);
                        const timeFormatted = minToTime(examSlotToMin(exam.startTime));
                        
                        return (
                          <div key={exam.id} className="flex items-center gap-4 p-3 glass-nocturne border border-slate-700/50 hover:border-cyan-500/30 transition-colors rounded-xl">
                            <div className="w-20 text-sm font-bold text-slate-400">{timeFormatted} Uhr</div>
                            <div className="flex-1 text-sm font-bold text-cyan-50 truncate">{student?.lastName}, {student?.firstName}</div>
                            <div className="w-40 shrink-0">
                              <label className="text-[10px] uppercase tracking-wider font-bold text-cyan-500/80 mb-1 block leading-none">Erreichte Pkt.</label>
                              <input 
                                type="text"
                                placeholder="..."
                                className="w-full h-8 px-3 text-sm font-bold bg-slate-950/50 text-white placeholder-slate-600 border border-slate-700/80 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner"
                                value={protocolPoints[exam.id]?.achieved || ''}
                                onChange={(e) => setProtocolPoints(prev => ({ ...prev, [exam.id]: { ...prev[exam.id], achieved: e.target.value, required: prev[exam.id]?.required || '' } }))}
                              />
                            </div>
                            <div className="w-40 shrink-0 border-l border-slate-700/50 pl-4">
                              <label className="text-[10px] uppercase tracking-wider font-bold text-cyan-500/80 mb-1 block leading-none">Benötigte Pkt.</label>
                              <input 
                                type="text"
                                placeholder="..."
                                className="w-full h-8 px-3 text-sm font-bold bg-slate-950/50 text-white placeholder-slate-600 border border-slate-700/80 rounded-lg focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner"
                                value={protocolPoints[exam.id]?.required || ''}
                                onChange={(e) => setProtocolPoints(prev => ({ ...prev, [exam.id]: { achieved: prev[exam.id]?.achieved || '', required: e.target.value } }))}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
