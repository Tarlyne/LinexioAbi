import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { UnlockScreen } from './components/UnlockScreen';
import { DataView } from './components/DataView';
import { PlanningView } from './components/PlanningView';
import { LiveMonitor } from './components/LiveMonitor';
import { ProtocolView } from './components/ProtocolView';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { Toast } from './components/Toast';
import { ExportPrintView } from './components/ExportPrintView';
import { SupervisionPrintView } from './components/SupervisionPrintView';
import { AutoLockWarningModal } from './components/AutoLockWarningModal';

const MainView: React.FC = () => {
  const { isLocked } = useAuth();
  const { isLoading } = useApp();
  const { days } = useData();
  const [activeTab, setActiveTab] = useState('monitor');
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persistent) => {
        if (persistent) console.debug("Storage persistent");
      });
    }
  }, []);

  if (isLoading) return null;
  if (isLocked) return <UnlockScreen />;
  
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
            {activeTab === 'protocols' && <ProtocolView />}
            {activeTab === 'exams' && <PlanningView onSetHeaderActions={setHeaderActions} />}
            {activeTab === 'data' && <DataView />}
            {activeTab === 'stats' && <StatsView onSetHeaderActions={setHeaderActions} />}
            {activeTab === 'settings' && <SettingsView />}
          </div>
          <Toast />
          <AutoLockWarningModal />
        </Layout>
      </div>
      
      <div className="print-only w-full">
        {/* Prüfungspläne */}
        {(days || []).map((_, idx) => (
          <div key={`exam-print-${idx}`} style={{ pageBreakAfter: 'always' }}>
            <ExportPrintView activeDayIdx={idx} isPreview={false} />
          </div>
        ))}
        {/* Aufsichtspläne */}
        {(days || []).map((_, idx) => (
          <div key={`sup-print-${idx}`} style={{ pageBreakAfter: 'always' }}>
            <SupervisionPrintView activeDayIdx={idx} />
          </div>
        ))}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <AppProvider>
          <MainView />
        </AppProvider>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;