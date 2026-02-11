import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useHeader } from '../context/HeaderContext';
import {
  Clock,
  Calendar,
  Database,
  ShieldCheck,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  FileStack,
  RefreshCw,
} from 'lucide-react';
import { LinexioLogoIcon } from './LinexioLogoIcon';
import { HistoryModal } from './HistoryModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { headerActions } = useHeader();
  const { lastUpdate, lastActionLabel, historyLogs } = useApp();

  const navItems = [
    { id: 'monitor', label: 'Live-Monitor', icon: <Clock size={20} /> },
    { id: 'protocols', label: 'Protokolle', icon: <FileStack size={20} /> },
    { id: 'exams', label: 'Prüfungsplan', icon: <Calendar size={20} /> },
    { id: 'stats', label: 'Aufsichtsplan', icon: <ShieldCheck size={20} /> },
    { id: 'data', label: 'Datenbank', icon: <Database size={20} /> },
    { id: 'settings', label: 'Einstellungen', icon: <Settings size={20} /> },
  ];

  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    const datePart = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const timePart = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}., ${timePart} Uhr`;
  };

  return (
    <div
      className="flex flex-col h-screen w-full dashboard-gradient select-none relative"
      data-active-tab={activeTab}
    >

      {/* Header */}
      <header
        className="border-b border-slate-700/30 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-md shrink-0 z-20 print:hidden transition-all duration-300"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 'calc(3.5rem + env(safe-area-inset-top, 0px))'
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center text-slate-200">
            <LinexioLogoIcon className="w-10 h-10 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all" />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-100">LinexioAbi</h1>
        </div>

        <div className="flex items-center gap-3">{headerActions}</div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden z-10 print:block">
        <nav
          className={`bg-slate-900/10 border-r border-slate-700/20 flex flex-col p-2 select-none transition-all duration-500 ease-in-out shrink-0 print:hidden ${isCollapsed ? 'w-16' : 'w-56'
            }`}
          style={{ willChange: 'width' }}
        >
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center h-[44px] rounded-xl transition-all duration-300 relative group overflow-hidden shrink-0 text-left ${activeTab === item.id
                  ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent'
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="w-11 h-full flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div
                  className={`flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isCollapsed
                    ? 'opacity-0 scale-95 -translate-x-4'
                    : 'opacity-100 scale-100 translate-x-0'
                    }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            ))}

            <div className="flex-grow" />

            {/* Letzte Änderung Info (Sidebar) - KLICKBAR */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden mb-2 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
                }`}
            >
              <button
                onClick={() => setShowHistory(true)}
                className="w-full text-left px-3 py-2 bg-slate-800/20 hover:bg-slate-800/40 rounded-xl border border-slate-700/20 hover:border-cyan-500/30 transition-all space-y-1 group"
              >
                <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-cyan-400 transition-colors">
                  <RefreshCw size={8} className="animate-spin-slow" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">
                    Letzte Änderung:
                  </span>
                </div>
                <div className="text-[10px] font-black text-cyan-400/90 leading-tight uppercase truncate">
                  {lastActionLabel || 'System bereit'}
                </div>
                <div className="text-[9px] text-slate-500 font-medium italic">
                  {formatDateTime(lastUpdate)}
                </div>
              </button>
            </div>

            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden mb-2 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
                }`}
            >
              <div className="px-3 py-2 bg-slate-800/10 rounded-xl border border-slate-700/10">
                <div className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
                  Build v0.9.0
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-800/50 pt-2 shrink-0 overflow-hidden">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`flex items-center h-[44px] rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/30 transition-all duration-300 overflow-hidden outline-none shrink-0 text-left`}
              title={isCollapsed ? 'Ausfahren' : 'Einklappen'}
            >
              <div className="w-11 h-full flex items-center justify-center shrink-0">
                {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
              </div>
              <div
                className={`flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isCollapsed
                  ? 'opacity-0 scale-95 -translate-x-4'
                  : 'opacity-100 scale-100 translate-x-0'
                  }`}
              >
                <span className="text-sm font-medium">Einklappen</span>
              </div>
            </button>
          </div>
        </nav>

        <main className="flex-1 relative flex flex-col overflow-hidden p-4 md:p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>

      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} logs={historyLogs} />
    </div>
  );
};
