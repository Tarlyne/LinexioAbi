
import localforage from 'localforage';
import { AppState } from '../types';

const DB_NAME = 'linexio_abi_db';
const STATE_KEY = 'app_state_v1';

localforage.config({
  name: 'LinexioAbi',
  storeName: 'main_store'
});

export const saveState = async (state: AppState): Promise<void> => {
  try {
    await localforage.setItem(STATE_KEY, { ...state, lastUpdate: Date.now() });
  } catch (err) {
    console.error('Failed to save state to indexedDB', err);
  }
};

export const loadState = async (): Promise<AppState | null> => {
  try {
    return await localforage.getItem<AppState>(STATE_KEY);
  } catch (err) {
    console.error('Failed to load state from indexedDB', err);
    return null;
  }
};
