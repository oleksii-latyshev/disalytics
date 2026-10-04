import { useCallback, useMemo } from 'react';
import { useSetting } from '@/core/settings';
import { DEFAULT_LAYOUT, formatLayout, type HomeLayout, parseLayout } from '../helpers/home-layout';

/** The Home grid the reader arranged, and the one way to change it: hand back the next layout. */
export function useHomeLayout(): [HomeLayout, (next: HomeLayout) => void, () => void] {
  const [stored, setStored] = useSetting('homeLayout');
  const layout = useMemo(() => parseLayout(stored), [stored]);
  const set = useCallback((next: HomeLayout) => setStored(formatLayout(next)), [setStored]);
  const reset = useCallback(() => setStored(formatLayout(DEFAULT_LAYOUT)), [setStored]);

  return [layout, set, reset];
}
