import {
  type PersistenceStatus,
  requestPersistence,
  type StorageReport,
  storageEstimate,
} from '@disa/demo-store';
import { useEffect, useState } from 'react';

export interface StorageReportState {
  /** `null` until the browser has answered — a status this screen has not read yet says nothing. */
  persistence: PersistenceStatus | null;
  estimate: StorageReport | null;
}

/**
 * What the device says about the cache — `docs/DESIGN.md` §10.2. Asking for persistence here is the
 * same call the store makes after every write, and this is the screen where the answer is worth
 * stating: a reader looking at their library is the one who wants to know the browser may take it
 * back.
 */
export function useStorageReport(): StorageReportState {
  const [report, setReport] = useState<StorageReportState>({ persistence: null, estimate: null });

  useEffect(() => {
    let listening = true;

    void Promise.all([requestPersistence(), storageEstimate()]).then(([persistence, estimate]) => {
      if (listening) setReport({ persistence, estimate });
    });

    return () => {
      listening = false;
    };
  }, []);

  return report;
}
