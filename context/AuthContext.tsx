
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings } from '../types';
import * as db from '../store/db';

interface AuthContextType {
  isLocked: boolean;
  masterPassword: string | null;
  settings: AppSettings;
  lockCountdown: number | null;
  isLockWarningVisible: boolean;
  unlock: (password: string) => Promise<any | null>;
  lock: () => void;
  extendSession: () => void;
  setMasterPassword: (password: string) => Promise<void>;
  changeMasterPassword: (oldPassword: string, newPassword: string, currentState: any) => Promise<boolean>;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultSettings: AppSettings = { autoLockMinutes: 10 };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPasswordState] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [isLockWarningVisible, setIsLockWarningVisible] = useState(false);
  
  const sessionPassword = useRef<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Initial Load (Auth Only)
  useEffect(() => {
    const checkAuthStatus = async () => {
      const saved = await db.loadState();
      if (saved) {
        if ('masterPassword' in saved && saved.masterPassword === 'SET') setMasterPasswordState('SET');
        // FIXED: Using 'in' operator to safely check for 'settings' property on union type
        if ('settings' in saved && saved.settings) setSettings({ ...defaultSettings, ...saved.settings });
      }
    };
    checkAuthStatus();
  }, []);

  const lock = useCallback(() => {
    sessionPassword.current = null;
    setIsLockWarningVisible(false);
    setLockCountdown(null);
    setIsLocked(true);
  }, []);

  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsLockWarningVisible(false);
    setLockCountdown(null);
  }, []);

  // User interaction listener for auto-lock reset
  useEffect(() => {
    if (isLocked) return;

    const handleInteraction = () => {
      const now = Date.now();
      // Throttle updates to once per second to prevent UI jank on iPads and save CPU
      if (now - lastActivityRef.current > 1000) {
        extendSession();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleInteraction, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleInteraction));
    };
  }, [isLocked, extendSession]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLocked || settings.autoLockMinutes <= 0) return;
      const idleMs = Date.now() - lastActivityRef.current;
      const thresholdMs = settings.autoLockMinutes * 60 * 1000;
      const warningThresholdMs = thresholdMs - (60 * 1000);

      if (idleMs >= thresholdMs) {
        lock();
      } else if (idleMs >= warningThresholdMs) {
        setIsLockWarningVisible(true);
        setLockCountdown(Math.ceil((thresholdMs - idleMs) / 1000));
      } else {
        if (isLockWarningVisible) setIsLockWarningVisible(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked, settings.autoLockMinutes, lock, isLockWarningVisible]);

  const unlock = useCallback(async (password: string) => {
    const decrypted = await db.loadState(password);
    if (decrypted) {
      sessionPassword.current = password;
      // FIXED: Using 'in' operator to safely check for 'settings' property on union type after decryption
      if ('settings' in decrypted && decrypted.settings) setSettings({ ...defaultSettings, ...decrypted.settings });
      setIsLocked(false);
      extendSession();
      return decrypted;
    }
    return null;
  }, [extendSession]);

  const setMasterPassword = useCallback(async (password: string) => {
    sessionPassword.current = password;
    setMasterPasswordState('SET');
    setIsLocked(false);
    extendSession();
  }, [extendSession]);

  const changeMasterPassword = useCallback(async (oldPw: string, newPw: string, currentState: any) => {
    const verified = await db.loadState(oldPw);
    if (!verified) return false;
    sessionPassword.current = newPw;
    await db.saveState(currentState, newPw);
    return true;
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const value = React.useMemo(() => ({
    isLocked, masterPassword, settings, lockCountdown, isLockWarningVisible,
    unlock, lock, extendSession, setMasterPassword, changeMasterPassword, updateSettings
  }), [isLocked, masterPassword, settings, lockCountdown, isLockWarningVisible, unlock, lock, extendSession, setMasterPassword, changeMasterPassword, updateSettings]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
