
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
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

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
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          headerActions={headerActions}
        >
          <div key={activeTab} className="h-full w-full animate-page-in">
            {activeTab === 'monitor' && <LiveMonitor />}
            {activeTab === 'exams' && <PlanningView onSetHeaderActions={setHeaderActions} />}
            {activeTab === 'data' && <DataView />}
            {activeTab === 'stats' && <StatsView onSetHeaderActions={setHeaderActions} />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
          <Toast />
        </Layout>
      </div>
      
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
