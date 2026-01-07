
import localforage from 'localforage';
import { AppState } from '../types';

const DB_NAME = 'linexio_abi_db';
const STATE_KEY = 'app_state_v1';

localforage.config({
  name: 'LinexioAbi',
  storeName: 'main_store'
});

// Helper for Base64 conversion
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

export const saveState = async (state: AppState, password?: string): Promise<void> => {
  try {
    const dataToSave = { ...state, lastUpdate: Date.now() };
    
    if (password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);
      const encoder = new TextEncoder();
      const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(JSON.stringify(dataToSave))
      );

      const bundle = {
        ciphertext: encodeBase64(new Uint8Array(encryptedContent)),
        iv: encodeBase64(iv),
        salt: encodeBase64(salt),
        isEncrypted: true,
        lastUpdate: dataToSave.lastUpdate
      };
      await localforage.setItem(STATE_KEY, bundle);
    } else {
      await localforage.setItem(STATE_KEY, dataToSave);
    }
  } catch (err) {
    console.error('Failed to save state to indexedDB', err);
  }
};

export const loadState = async (password?: string): Promise<any | null> => {
  try {
    const item: any = await localforage.getItem(STATE_KEY);
    if (!item) return null;

    if (item.isEncrypted) {
      if (!password) return { isLocked: true, masterPassword: 'SET' };
      
      const salt = decodeBase64(item.salt);
      const iv = decodeBase64(item.iv);
      const ciphertext = decodeBase64(item.ciphertext);
      const key = await deriveKey(password, salt);
      
      try {
        const decryptedContent = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedContent));
      } catch (e) {
        throw new Error('WRONG_PASSWORD');
      }
    }
    
    return item;
  } catch (err) {
    if (err instanceof Error && err.message === 'WRONG_PASSWORD') throw err;
    console.error('Failed to load state from indexedDB', err);
    return null;
  }
};

/**
 * Erstellt einen verschlüsselten Binär-Container für den Datei-Export (.lxabi)
 */
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

  // Layout: [SALT (16 bytes) | IV (12 bytes) | CIPHERTEXT]
  const container = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
  container.set(salt, 0);
  container.set(iv, salt.length);
  container.set(new Uint8Array(encryptedContent), salt.length + iv.length);
  
  return new Blob([container], { type: 'application/octet-stream' });
};

/**
 * Entschlüsselt einen .lxabi Binär-Container
 */
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
    return JSON.parse(decoder.decode(decryptedContent));
  } catch (e) {
    throw new Error('WRONG_PASSWORD');
  }
};

export const clearDatabase = async (): Promise<void> => {
  await localforage.clear();
};
