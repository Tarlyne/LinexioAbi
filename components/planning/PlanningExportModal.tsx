import React, { useState, useMemo } from 'react';
import { Modal } from '../Modal';
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
  const [exportType, setExportType] = useState<'exam' | 'prep'>('exam');
  const [isExporting, setIsExporting] = useState(false);

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
    const prefix = exportType === 'exam' ? 'Pruefungsplan' : 'Vorbereitungsplan';
    const filename = `${prefix}_${dayLabel.replace(/\s/g, '_')}`;

    try {
      if (exportType === 'exam') {
        await PdfExportService.generateAndDownload(appState, activeDayIdx, filename);
      } else {
        await PdfExportService.generatePrepRoomPdf(appState, activeDayIdx, filename);
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
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Export-Vorschau</h3>
              <p className="text-xs text-cyan-500/80 font-medium">
                {exportType === 'exam' ? 'Prüfungsplan' : 'Vorbereitungsplan'} für{' '}
                {formattedDayInfo}
              </p>
            </div>
          </div>

          <div className="segmented-control-wrapper w-64 h-9">
            <div
              className="segmented-control-slider"
              style={{
                width: 'calc((100% - 6px) / 2)',
                transform: `translateX(calc(${exportType === 'exam' ? 0 : 1} * 100%))`,
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
                      className={`p-3 rounded-xl border flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-2 duration-300 ${
                        issue.severity === 'error'
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
                          className={`text-[10px] font-bold uppercase tracking-tight ${
                            issue.severity === 'error'
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
              ) : (
                <PrepRoomPrintView activeDayIdx={activeDayIdx} isPreview={true} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
