import localforage from 'localforage';
import { AppState, SerializedState, LockedState, DbMeta, EncryptedUnit } from '../types';

const LEGACY_STATE_KEY = 'app_state_v1';
const META_KEY = 'lx_meta';

// Granulare Keys für atomare Operationen
export const DATA_KEYS = {
  TEACHERS: 'lx_teachers',
  STUDENTS: 'lx_students',
  ROOMS: 'lx_rooms',
  DAYS: 'lx_days',
  SUBJECTS: 'lx_subjects',
  EXAMS: 'lx_exams',
  SUPERVISIONS: 'lx_supervisions',
  COLLECTED: 'lx_collected',
  SETTINGS: 'lx_settings'
};

localforage.config({
  name: 'LinexioAbi',
  storeName: 'main_store'
});

// --- HELPER FUNCTIONS ---

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// --- CORE ENCRYPTION ENGINE ---

async function encryptData(data: any, key: CryptoKey): Promise<EncryptedUnit> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  return {
    ciphertext: encodeBase64(new Uint8Array(encryptedContent)),
    iv: encodeBase64(iv)
  };
}

async function decryptData(unit: EncryptedUnit, key: CryptoKey): Promise<any> {
  try {
    const iv = decodeBase64(unit.iv);
    const ciphertext = decodeBase64(unit.ciphertext);
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedContent));
  } catch (e) {
    throw new Error('DECRYPT_FAILED');
  }
}

// --- PUBLIC DATABASE API ---

/**
 * Speichert eine einzelne Entität oder den gesamten State granular.
 * Falls kein Key übergeben wird, wird der komplette State gespeichert.
 */
export const saveState = async (state: AppState, password?: string, specificKey?: string): Promise<void> => {
  try {
    let key: CryptoKey | null = null;
    let meta = await localforage.getItem<DbMeta>(META_KEY);

    if (password) {
      let salt: Uint8Array;
      if (meta?.salt) {
        salt = decodeBase64(meta.salt);
      } else {
        salt = crypto.getRandomValues(new Uint8Array(16));
      }
      key = await deriveKey(password, salt);

      // Meta aktualisieren
      await localforage.setItem(META_KEY, {
        version: 2,
        isEncrypted: true,
        lastUpdate: Date.now(),
        salt: encodeBase64(salt)
      } as DbMeta);
    } else {
      await localforage.setItem(META_KEY, {
        version: 2,
        isEncrypted: false,
        lastUpdate: Date.now()
      } as DbMeta);
    }

    const saveUnit = async (dbKey: string, data: any) => {
      if (key) {
        const encrypted = await encryptData(data, key);
        await localforage.setItem(dbKey, encrypted);
      } else {
        await localforage.setItem(dbKey, data);
      }
    };

    // Mapping von State-Properties auf DB-Keys
    const mapping: Record<string, string> = {
      teachers: DATA_KEYS.TEACHERS,
      students: DATA_KEYS.STUDENTS,
      rooms: DATA_KEYS.ROOMS,
      days: DATA_KEYS.DAYS,
      subjects: DATA_KEYS.SUBJECTS,
      exams: DATA_KEYS.EXAMS,
      supervisions: DATA_KEYS.SUPERVISIONS,
      collectedExamIds: DATA_KEYS.COLLECTED,
      settings: DATA_KEYS.SETTINGS
    };

    if (specificKey && mapping[specificKey]) {
      await saveUnit(mapping[specificKey], (state as any)[specificKey]);
    } else {
      // Alles speichern
      for (const [stateKey, dbKey] of Object.entries(mapping)) {
        await saveUnit(dbKey, (state as any)[stateKey]);
      }
    }
  } catch (err) {
    console.error('Failed to save state to indexedDB', err);
  }
};

/**
 * Lädt den gesamten App-State. Führt bei Bedarf eine Migration vom Monolithen durch.
 */
export const loadState = async (password?: string): Promise<AppState | LockedState | null> => {
  try {
    const legacy = await localforage.getItem<SerializedState | AppState>(LEGACY_STATE_KEY);
    const meta = await localforage.getItem<DbMeta>(META_KEY);

    // MIGRATIONSLOGIK (Kategorie B)
    if (legacy) {
      console.info('[DB] Legacy monolith detected. Starting migration...');
      let decryptedLegacy: AppState | null = null;

      if ('isEncrypted' in legacy && legacy.isEncrypted) {
        if (!password) return { isLocked: true, masterPassword: 'SET' } as LockedState;
        
        const salt = decodeBase64(legacy.salt!);
        const iv = decodeBase64(legacy.iv!);
        const ciphertext = decodeBase64(legacy.ciphertext!);
        const key = await deriveKey(password, salt);
        
        try {
          const decryptedContent = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
          decryptedLegacy = JSON.parse(new TextDecoder().decode(decryptedContent));
        } catch (e) {
          throw new Error('WRONG_PASSWORD');
        }
      } else {
        decryptedLegacy = legacy as AppState;
      }

      if (decryptedLegacy) {
        await saveState(decryptedLegacy, password);
        await localforage.removeItem(LEGACY_STATE_KEY);
        console.info('[DB] Migration successful.');
        return decryptedLegacy;
      }
    }

    if (!meta) return null;

    let key: CryptoKey | null = null;
    if (meta.isEncrypted) {
      if (!password) return { isLocked: true, masterPassword: 'SET' } as LockedState;
      key = await deriveKey(password, decodeBase64(meta.salt!));
    }

    const loadUnit = async (dbKey: string) => {
      const item = await localforage.getItem<any>(dbKey);
      if (!item) return null;
      if (key) return await decryptData(item as EncryptedUnit, key);
      return item;
    };

    try {
      const results = await Promise.all([
        loadUnit(DATA_KEYS.TEACHERS),
        loadUnit(DATA_KEYS.STUDENTS),
        loadUnit(DATA_KEYS.ROOMS),
        loadUnit(DATA_KEYS.DAYS),
        loadUnit(DATA_KEYS.SUBJECTS),
        loadUnit(DATA_KEYS.EXAMS),
        loadUnit(DATA_KEYS.SUPERVISIONS),
        loadUnit(DATA_KEYS.COLLECTED),
        loadUnit(DATA_KEYS.SETTINGS)
      ]);

      if (results.every(r => r === null)) return null;

      return {
        teachers: results[0] || [],
        students: results[1] || [],
        rooms: results[2] || [],
        days: results[3] || [],
        subjects: results[4] || [],
        exams: results[5] || [],
        supervisions: results[6] || [],
        collectedExamIds: results[7] || [],
        settings: results[8] || { autoLockMinutes: 10 },
        isLocked: false,
        masterPassword: password ? 'SET' : null,
        lastUpdate: meta.lastUpdate
      } as AppState;
    } catch (e) {
      if (password) throw new Error('WRONG_PASSWORD');
      return null;
    }
  } catch (err) {
    if (err instanceof Error && (err.message === 'WRONG_PASSWORD' || err.message === 'DECRYPT_FAILED')) {
      throw new Error('WRONG_PASSWORD');
    }
    console.error('Failed to load state from indexedDB', err);
    return null;
  }
};

// Datei-Export bleibt Monolith für Portabilität
export const encryptForFile = async (state: AppState, password: string): Promise<Blob> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encoder = new TextEncoder();
  
  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(state))
  );

  const container = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
  container.set(salt, 0);
  container.set(iv, salt.length);
  container.set(new Uint8Array(encryptedContent), salt.length + iv.length);
  
  return new Blob([container], { type: 'application/octet-stream' });
};

export const decryptFromFile = async (buffer: ArrayBuffer, password: string): Promise<AppState> => {
  const view = new Uint8Array(buffer);
  const salt = view.slice(0, 16);
  const iv = view.slice(16, 28);
  const ciphertext = view.slice(28);
  
  const key = await deriveKey(password, salt);
  
  try {
    const decryptedContent = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedContent)) as AppState;
  } catch (e) {
    throw new Error('WRONG_PASSWORD');
  }
};

export const clearDatabase = async (): Promise<void> => {
  await localforage.clear();
};