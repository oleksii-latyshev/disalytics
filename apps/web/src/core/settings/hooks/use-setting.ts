import { useCallback, useSyncExternalStore } from 'react';
import type { SettingKey, Settings } from '../helpers/settings';
import { settingsStore } from '../helpers/store';

/** One preference and the way to change it. Every value is discrete, so React may hold it. */
export function useSetting<K extends SettingKey>(
  key: K,
): [Settings[K], (value: Settings[K]) => void] {
  const value = useSyncExternalStore(
    settingsStore.subscribe,
    () => settingsStore.read()[key],
    () => settingsStore.read()[key],
  );

  const set = useCallback((next: Settings[K]) => settingsStore.write(key, next), [key]);

  return [value, set];
}

/** A flag and its toggle, for the rows that are a switch rather than a choice. */
export function useSettingToggle(
  key: { [K in SettingKey]: Settings[K] extends boolean ? K : never }[SettingKey],
): [boolean, () => void] {
  const [value, set] = useSetting(key);
  const toggle = useCallback(() => set(!value), [set, value]);

  return [value, toggle];
}
