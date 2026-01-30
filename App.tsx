import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { HeaderProvider } from './context/HeaderContext';
import { DataProvider, useData } from './context/DataContext';
import { AppProvider, useApp } from './context/AppContext';
import { DnDProvider } from './context/DnDContext';
import { Layout } from './components/Layout';
import { UnlockScreen } from './components/UnlockScreen';
import { DataView } from './components/DataView';
import { PlanningView } from './components/planning/PlanningView';
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

  useEffect(() => {
    // Versuch, Speicherpersistenz automatisch zu erlangen
    const initPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        try {
          const persistent = await navigator.storage.persist();
          if (persistent) {
            console.debug('Storage is persistent');
          } else {
            console.debug('Storage is temporary');
          }
        } catch (err) {
          console.debug('Persistence request failed:', err);
        }
      }
    };
    initPersistence();
  }, []);

  if (isLoading) return null;
  if (isLocked) return <UnlockScreen />;

  return (
    <>
      <div className="no-print h-screen flex flex-col">
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          <div key={activeTab} className="h-full w-full animate-page-in">
            {activeTab === 'monitor' && <LiveMonitor />}
            {activeTab === 'protocols' && <ProtocolView />}
            {activeTab === 'exams' && <PlanningView />}
            {activeTab === 'data' && <DataView />}
            {activeTab === 'stats' && <StatsView />}
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
      <UIProvider>
        <HeaderProvider>
          <DataProvider>
            <AppProvider>
              <DnDProvider>
                <MainView />
              </DnDProvider>
            </AppProvider>
          </DataProvider>
        </HeaderProvider>
      </UIProvider>
    </AuthProvider>
  );
};

export default App;
