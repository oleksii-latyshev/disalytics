import { loadMapNavGrid, type NavGrid } from '@disa/map-data';
import { useEffect, useState } from 'react';

/** The walkable grid of a map once its chunk has loaded; `undefined` until then or for a map without one. */
export function useTacticNavGrid(map: string): NavGrid | undefined {
  const [loaded, setLoaded] = useState<NavGrid | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    setLoaded(undefined);
    loadMapNavGrid(map).then((grid) => {
      if (isCurrent) setLoaded(grid);
    });
    return () => {
      isCurrent = false;
    };
  }, [map]);

  return loaded;
}
