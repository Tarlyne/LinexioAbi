import localforage from 'localforage';
import { AppState, AuthMeta, EncryptedUnit, LockedState } from '../types';

const AUTH_KEY = 'lx_auth_v2';
export const DATA_KEYS = {
  TEACHERS: 'lx_teachers',
  STUDENTS: 'lx_students',
  ROOMS: 'lx_rooms',
  DAYS: 'lx_days',
  SUBJECTS: 'lx_subjects',
  EXAMS: 'lx_exams',
  SUPERVISIONS: 'lx_supervisions',
  COLLECTED: 'lx_collected',
  SETTINGS: 'lx_settings',
  HISTORY: 'lx_history',
};

localforage.config({ name: 'LinexioAbi', storeName: 'main_store' });

// --- HELPERS (Exakt wie im Security Core) ---
function toBase64(arr: Uint8Array | ArrayBuffer): string {
  const bytes = new Uint8Array(arr);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// --- SECURITY CORE LOGIC ---

export const getAuthStatus = async (): Promise<{ hasAuth: boolean }> => {
  const auth = await localforage.getItem<AuthMeta>(AUTH_KEY);
  return { hasAuth: !!auth };
};

export const setupAuth = async (password: string): Promise<CryptoKey> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const verifyContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode('VERIFY')
  );

  const meta: AuthMeta = {
    salt: toBase64(salt),
    verifyIv: toBase64(iv),
    verifyCipher: toBase64(verifyContent),
    version: 1,
  };

  await localforage.setItem(AUTH_KEY, meta);
  return key;
};

export const verifyAndGetKey = async (password: string): Promise<CryptoKey | null> => {
  const meta = await localforage.getItem<AuthMeta>(AUTH_KEY);
  if (!meta) return null;

  try {
    const key = await deriveKey(password, fromBase64(meta.salt));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(meta.verifyIv) },
      key,
      fromBase64(meta.verifyCipher)
    );
    const check = new TextDecoder().decode(decrypted);
    return check === 'VERIFY' ? key : null;
  } catch (e) {
    return null;
  }
};

// --- DATA ACCESS ---

export const saveEncryptedState = async (
  state: AppState,
  key: CryptoKey,
  specificKey?: string
): Promise<void> => {
  const encrypt = async (data: any) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    return { ciphertext: toBase64(cipher), iv: toBase64(iv) } as EncryptedUnit;
  };

  const mapping: Record<string, string> = {
    teachers: DATA_KEYS.TEACHERS,
    students: DATA_KEYS.STUDENTS,
    rooms: DATA_KEYS.ROOMS,
    days: DATA_KEYS.DAYS,
    subjects: DATA_KEYS.SUBJECTS,
    exams: DATA_KEYS.EXAMS,
    supervisions: DATA_KEYS.SUPERVISIONS,
    collectedExamIds: DATA_KEYS.COLLECTED,
    settings: DATA_KEYS.SETTINGS,
    historyLogs: DATA_KEYS.HISTORY,
  };

  if (specificKey && mapping[specificKey]) {
    await localforage.setItem(mapping[specificKey], await encrypt((state as any)[specificKey]));
  } else {
    for (const [sK, dK] of Object.entries(mapping)) {
      await localforage.setItem(dK, await encrypt((state as any)[sK]));
    }
  }
};

export const loadEncryptedState = async (key: CryptoKey): Promise<Partial<AppState>> => {
  const decrypt = async (dbKey: string) => {
    const item = await localforage.getItem<EncryptedUnit>(dbKey);
    if (!item) return null;
    try {
      const dec = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(item.iv) },
        key,
        fromBase64(item.ciphertext)
      );
      return JSON.parse(new TextDecoder().decode(dec));
    } catch (e) {
      return null;
    }
  };

  const r = await Promise.all(Object.values(DATA_KEYS).map((k) => decrypt(k)));
  return {
    teachers: r[0] || [],
    students: r[1] || [],
    rooms: r[2] || [],
    days: r[3] || [],
    subjects: r[4] || [],
    exams: r[5] || [],
    supervisions: r[6] || [],
    collectedExamIds: r[7] || [],
    settings: r[8] || { autoLockMinutes: 10 },
    historyLogs: r[9] || [],
  };
};

/**
 * Encrypts the full AppState into a Blob for file backup.
 */
export const encryptForFile = async (state: AppState, password: string): Promise<Blob> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(state))
  );

  const payload = {
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(cipher),
  };

  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
};

/**
 * Decrypts an AppState from an ArrayBuffer (from a backup file).
 */
export const decryptFromFile = async (buffer: ArrayBuffer, password: string): Promise<AppState> => {
  const payload = JSON.parse(new TextDecoder().decode(buffer));
  const key = await deriveKey(password, fromBase64(payload.salt));
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(dec));
};

export const clearDatabase = async (): Promise<void> => {
  await localforage.clear();
};
