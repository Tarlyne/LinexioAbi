
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { UnlockScreen } from './components/UnlockScreen';
import { DataView } from './components/DataView';
import { PlanningView } from './components/PlanningView';
import { LiveMonitor } from './components/LiveMonitor';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
import { ExportPrintView } from './components/ExportPrintView';

const MainView: React.FC = () => {
  const { state, isLoading } = useApp();
  const [activeTab, setActiveTab] = useState('monitor');

  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) {
          console.debug("Storage persistent");
        }
      });
    }
  }, []);

  if (isLoading) return null;
  
  return (
    <>
      <div className="no-print h-screen flex flex-col">
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          <div className="h-full w-full">
            {activeTab === 'monitor' && <LiveMonitor />}
            {activeTab === 'exams' && <PlanningView />}
            {activeTab === 'data' && <DataView />}
            {activeTab === 'stats' && <StatsView />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
          <Toast />
        </Layout>
      </div>
      
      {/* Zentraler Druck-Container: Im Screen-Modus unsichtbar, im Druckmodus sichtbar */}
      <div className="print-only w-full">
        {state.days.map((_, idx) => (
          <div key={idx} style={{ pageBreakAfter: 'always' }}>
            <ExportPrintView activeDayIdx={idx} isPreview={false} />
          </div>
        ))}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainView />
    </AppProvider>
  );
};

export default App;
