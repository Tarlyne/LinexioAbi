
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { UnlockScreen } from './components/UnlockScreen';
import { DataView } from './components/DataView';
import { PlanningView } from './components/PlanningView';
import { LiveMonitor } from './components/LiveMonitor';
import { StatsView } from './components/StatsView';
import { Toast } from './components/Toast';

const MainView: React.FC = () => {
  const { state, isLoading } = useApp();
  const [activeTab, setActiveTab] = useState('monitor');

  if (isLoading) return null;
  
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="h-full w-full">
        {activeTab === 'monitor' && <LiveMonitor />}
        {activeTab === 'exams' && <PlanningView />}
        {activeTab === 'data' && <DataView />}
        {activeTab === 'stats' && <StatsView />}
      </div>
      <Toast />
    </Layout>
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
