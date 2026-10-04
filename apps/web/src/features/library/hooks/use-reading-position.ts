import { useEffect } from 'react';
import { useSetting } from '@/core/settings';
import { formatReading } from '../helpers/home-reading';

/**
 * Remembers which round of which match the reader is on, so Home can say *Resume at round N* and
 * mean it. Only the last match is kept: Home continues one, and a record per demo would outlive the
 * demo's own cache entry. `null` is no match open yet.
 */
export function useReadingPosition(demoKey: string | null, round: number): void {
  const [, setReading] = useSetting('homeReading');

  useEffect(() => {
    // A demo that could not be cached has a throwaway key, and nothing to resume.
    if (demoKey === null || demoKey.startsWith('volatile:')) return;
    setReading(formatReading({ key: demoKey, round, at: Date.now() }));
  }, [demoKey, round, setReading]);
}
