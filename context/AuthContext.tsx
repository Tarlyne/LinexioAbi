import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, AppState } from '../types';
import * as db from '../store/db';

/**
 * Fix: Added masterPassword and changeMasterPassword to AuthContextType and AuthProvider implementation
 * to satisfy requirements from AppContext and SettingsView.
 */
interface AuthContextType {
  isLocked: boolean;
  requiresSetup: boolean;
  settings: AppSettings;
  masterPassword: string | null;
  lockCountdown: number | null;
  isLockWarningVisible: boolean;
  unlock: (password: string) => Promise<any | null>;
  lock: () => void;
  extendSession: () => void;
  setMasterPassword: (password: string) => Promise<void>;
  changeMasterPassword: (
    oldPw: string,
    newPw: string,
    currentData: Partial<AppState>
  ) => Promise<boolean>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  persistEncrypted: (state: AppState, specificKey?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ autoLockMinutes: 10 });
  const [masterPassword, setMasterPasswordState] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isLockWarningVisible, setIsLockWarningVisible] = useState(false);

  const masterKey = useRef<CryptoKey | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const init = async () => {
      const { hasAuth } = await db.getAuthStatus();
      setRequiresSetup(!hasAuth);
    };
    init();
  }, []);

  const lock = useCallback(() => {
    masterKey.current = null;
    setMasterPasswordState(null);
    setIsLockWarningVisible(false);
    setLockCountdown(null);
    setIsLocked(true);
  }, []);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsLockWarningVisible(false);
  }, []);

  /**
   * GLOBAL ACTIVITY DETECTION (Tablet-First Protection)
   * Registriert globale Events, um den Inaktivitäts-Timer bei echter Nutzung zurückzusetzen.
   */
  useEffect(() => {
    if (isLocked || settings.autoLockMinutes <= 0) return;

    const handleActivity = () => {
      const now = Date.now();
      // Throttling: Wir aktualisieren den Ref nur, wenn das Warn-Modal offen ist (um es sofort zu schließen)
      // ODER wenn seit der letzten Speicherung mehr als 5 Sekunden vergangen sind.
      // Dies schont die Performance bei schnellen Klicks/Eingaben.
      if (isLockWarningVisible || now - lastActivityRef.current > 5000) {
        extendSession();
      }
    };

    // Events, die echte Benutzerabsicht signalisieren
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    activityEvents.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      activityEvents.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [isLocked, settings.autoLockMinutes, isLockWarningVisible, extendSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLocked || settings.autoLockMinutes <= 0) return;
      const idleMs = Date.now() - lastActivityRef.current;
      const thresholdMs = settings.autoLockMinutes * 60 * 1000;
      if (idleMs >= thresholdMs) lock();
      else if (idleMs >= thresholdMs - 60000) {
        setIsLockWarningVisible(true);
        setLockCountdown(Math.ceil((thresholdMs - idleMs) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, settings.autoLockMinutes, lock]);

  const unlock = useCallback(
    async (password: string) => {
      const key = await db.verifyAndGetKey(password);
      if (key) {
        masterKey.current = key;
        setMasterPasswordState(password);
        const data = await db.loadEncryptedState(key);
        if (data.settings) setSettings(data.settings);
        setIsLocked(false);
        extendSession();
        return data;
      }
      return null;
    },
    [extendSession]
  );

  const setMasterPassword = useCallback(
    async (password: string) => {
      const key = await db.setupAuth(password);
      masterKey.current = key;
      setMasterPasswordState(password);
      setRequiresSetup(false);
      setIsLocked(false);
      extendSession();
    },
    [extendSession]
  );

  // Fix: Implemented changeMasterPassword to allow password updates and data re-encryption
  const changeMasterPassword = useCallback(
    async (oldPw: string, newPw: string, currentData: Partial<AppState>) => {
      const key = await db.verifyAndGetKey(oldPw);
      if (!key) return false;

      // Load full state using OLD key to ensure we don't lose data that wasn't passed in currentData
      const fullData = await db.loadEncryptedState(key);

      // Setup new auth (updates localforage auth metadata)
      const newKey = await db.setupAuth(newPw);
      masterKey.current = newKey;
      setMasterPasswordState(newPw);

      // Re-encrypt combined state with NEW key
      const mergedState = { ...fullData, ...currentData } as AppState;
      await db.saveEncryptedState(mergedState, newKey);

      return true;
    },
    []
  );

  const persistEncrypted = useCallback(
    async (state: AppState, specificKey?: string) => {
      if (isLocked || !masterKey.current) return;
      await db.saveEncryptedState(state, masterKey.current, specificKey);
    },
    [isLocked]
  );

  return (
    <AuthContext.Provider
      value={{
        isLocked,
        requiresSetup,
        settings,
        masterPassword,
        lockCountdown,
        isLockWarningVisible,
        unlock,
        lock,
        extendSession,
        setMasterPassword,
        changeMasterPassword,
        updateSettings: (s) => setSettings((prev) => ({ ...prev, ...s })),
        persistEncrypted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth missing');
  return c;
};
