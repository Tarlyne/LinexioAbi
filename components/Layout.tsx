
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, Calendar, Database, ShieldCheck, Settings, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { LinexioLogoIcon } from './LinexioLogoIcon';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerActions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, headerActions }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navItems = [
    { id: 'monitor', label: 'Live-Monitor', icon: <Clock size={20} /> },
    { id: 'exams', label: 'Prüfungsplan', icon: <Calendar size={20} /> },
    { id: 'stats', label: 'Aufsichtsplan', icon: <ShieldCheck size={20} /> },
    { id: 'data', label: 'Datenbank', icon: <Database size={20} /> },
    { id: 'settings', label: 'Einstellungen', icon: <Settings size={20} /> },
  ];

  const lastUpdated = new Date().toLocaleString('de-DE', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });

  return (
    <div className="flex flex-col h-screen w-full dashboard-gradient select-none relative">
      {/* Global Aurora Background Layers */}
      <div className="aurora-container print:hidden">
        <div className="aurora-glow" style={{ top: '-20%', left: '-20%' }}></div>
        <div className="aurora-glow-secondary" style={{ bottom: '0%', right: '0%' }}></div>
        <div className="aurora-glow" style={{ top: '40%', right: '-30%', animationDelay: '-15s', opacity: 0.15 }}></div>
      </div>

      {/* Header */}
      <header className="h-12 border-b border-slate-700/30 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-md shrink-0 z-20 print:hidden">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center text-slate-200">
            <LinexioLogoIcon className="w-7 h-7 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
          </div>
          <h1 className="font-bold text-sm tracking-tight text-slate-200">LinexioAbi</h1>
        </div>
        
        {/* Header Actions Slot */}
        <div className="flex items-center gap-3">
          {headerActions}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden z-10 print:block">
        <nav 
          className={`bg-slate-900/10 border-r border-slate-700/20 flex flex-col p-2 select-none transition-all duration-500 ease-in-out shrink-0 print:hidden ${
            isCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center h-[44px] rounded-xl transition-all duration-300 relative group overflow-hidden shrink-0 text-left ${
                  activeTab === item.id
                    ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)] border border-cyan-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border border-transparent'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="w-11 h-full flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className={`flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${
                  isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'
                }`}>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </button>
            ))}

            <div className="flex-grow" />

            <div className={`transition-all duration-500 ease-in-out overflow-hidden mb-2 ${
              isCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
            }`}>
              <div className="p-3 bg-slate-800/20 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Version: 0.6</div>
                <div className="text-[9px] text-slate-600 font-medium leading-tight text-left">zuletzt aktualisiert am: <br/> {lastUpdated}</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-1 border-t border-slate-800/50 pt-2 shrink-0 overflow-hidden">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              onPointerUp={(e) => e.currentTarget.blur()}
              className={`flex items-center h-[44px] rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/30 transition-all duration-300 overflow-hidden outline-none shrink-0 text-left`}
              title={isCollapsed ? "Ausfahren" : "Einklappen"}
            >
              <div className="w-11 h-full flex items-center justify-center shrink-0">
                {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
              </div>
              <div className={`flex-1 transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${
                isCollapsed ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'
              }`}>
                <span className="text-sm font-medium">Einklappen</span>
              </div>
            </button>
          </div>
        </nav>

        <main className="flex-1 relative flex flex-col overflow-hidden p-4 md:p-6 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
};
