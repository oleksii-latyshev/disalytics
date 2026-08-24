import { applyDocumentSettings } from './document';
import {
  formatSetting,
  type SettingKey,
  type Settings,
  settingsFrom,
  storageKeyOf,
} from './settings';

type Listener = () => void;

/**
 * The reader's preferences, held once for the whole app. `AGENTS.md` §2 rule 5 puts them in
 * `localStorage` — they are interface state, not parsed data — and a browser that refuses storage
 * keeps them for the session instead of refusing to render.
 */
export interface SettingsStore {
  read(): Settings;
  write<K extends SettingKey>(key: K, value: Settings[K]): void;
  subscribe(listener: Listener): () => void;
}

function readStorage(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStorage(storageKey: string, value: string): void {
  try {
    localStorage.setItem(storageKey, value);
  } catch {
    // The preference still holds for this session; only outliving it needs storage.
  }
}

export function createSettingsStore(read = readStorage, save = writeStorage): SettingsStore {
  let current = settingsFrom(read);
  const listeners = new Set<Listener>();

  applyDocumentSettings(current);

  return {
    read: () => current,

    write(key, value) {
      if (current[key] === value) return;

      current = { ...current, [key]: value };
      save(storageKeyOf(key), formatSetting(key, value));
      applyDocumentSettings(current);

      for (const listener of listeners) listener();
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const settingsStore = createSettingsStore();
