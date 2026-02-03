import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

interface HeaderContextType {
  headerActions: React.ReactNode;
  setHeaderActions: (actions: React.ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  const value = useMemo(
    () => ({
      headerActions,
      setHeaderActions,
    }),
    [headerActions]
  );

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
};

/**
 * Hook zum Setzen der Header-Aktionen.
 * Wenn 'actions' übergeben wird, werden diese beim Mounten gesetzt und beim Unmounten automatisch entfernt.
 */
export const useHeader = (actions?: React.ReactNode) => {
  const context = useContext(HeaderContext);
  if (!context) throw new Error('useHeader must be used within HeaderProvider');

  useEffect(() => {
    if (actions !== undefined) {
      context.setHeaderActions(actions);
      return () => context.setHeaderActions(null);
    }
  }, [actions]); // context removed from deps as it is stable within the provider

  return context;
};
