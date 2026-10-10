import type { Tactic } from '@disa/demo-core';
import { useEffect, useState } from 'react';
import { loadOfflineTactics, refreshBuiltInTactics } from '../helpers/built-in-tactics';

const NONE: readonly Tactic[] = [];

/**
 * The built-in tactics: at once from the device (the last API copy, else the bundled ones), then
 * the API's answer when it arrives, so the library never waits on the network.
 */
export function useBuiltInTactics(): readonly Tactic[] {
  const [tactics, setTactics] = useState<readonly Tactic[]>(NONE);

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      const offline = await loadOfflineTactics();
      if (isCurrent) setTactics(offline);
      const fresh = await refreshBuiltInTactics();
      if (isCurrent && fresh !== null) setTactics(fresh);
    };
    load().catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  return tactics;
}
