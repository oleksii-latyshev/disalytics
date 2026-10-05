import type { MapId } from './generated/overviews';

export interface MapCallout {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius?: number | undefined;
}

const MAP_CALLOUTS: Readonly<Record<MapId, readonly MapCallout[]>> = {
  de_mirage: [
    { name: 'A Site', x: -280, y: -1650, radius: 450 },
    { name: 'Default A', x: -260, y: -1580, radius: 250 },
    { name: 'Triple', x: -300, y: -1350, radius: 250 },
    { name: 'CT / Ticket', x: -1050, y: -1650, radius: 400 },
    { name: 'Jungle', x: -750, y: -1000, radius: 350 },
    { name: 'Stairs', x: -600, y: -1300, radius: 300 },
    { name: 'Connector', x: -800, y: -700, radius: 350 },
    { name: 'Window', x: -1050, y: -350, radius: 350 },
    { name: 'Catwalk / Short', x: -400, y: -200, radius: 400 },
    { name: 'Underpass', x: -1100, y: -750, radius: 350 },
    { name: 'B Site', x: -1700, y: -400, radius: 450 },
    { name: 'Default B', x: -1600, y: -350, radius: 250 },
    { name: 'Market / Kitchen', x: -1650, y: -950, radius: 450 },
    { name: 'B Apartments', x: -2100, y: 200, radius: 450 },
    { name: 'Palace', x: 100, y: -1600, radius: 450 },
    { name: 'Tetris', x: -350, y: -950, radius: 300 },
    { name: 'Firebox', x: -50, y: -1450, radius: 250 },
    { name: 'Bench', x: -1250, y: -100, radius: 300 },
    { name: 'Van', x: -1750, y: 200, radius: 300 },
    { name: 'Top Mid', x: -1500, y: 400, radius: 450 },
    { name: 'T Roof', x: -1100, y: 800, radius: 450 },
    { name: 'T Spawn', x: 1100, y: -300, radius: 600 },
  ],
  de_dust2: [
    { name: 'A Site', x: 1120, y: 2530, radius: 500 },
    { name: 'Goose', x: 1350, y: 2650, radius: 250 },
    { name: 'A Platform', x: 600, y: 2330, radius: 320 },
    { name: 'A Ramp', x: 1000, y: 1850, radius: 420 },
    { name: 'A Long', x: 1000, y: 1100, radius: 600 },
    { name: 'Long Doors', x: 750, y: 800, radius: 300 },
    { name: 'Outside Long', x: 600, y: 600, radius: 350 },
    { name: 'Pit', x: 1200, y: 600, radius: 400 },
    { name: 'A Short / Catwalk', x: 200, y: 2000, radius: 450 },
    { name: 'Short Stairs', x: 300, y: 1450, radius: 350 },
    { name: 'CT Spawn', x: -200, y: 2100, radius: 500 },
    { name: 'Mid Doors', x: -400, y: 1400, radius: 400 },
    { name: 'Xbox', x: -350, y: 1700, radius: 300 },
    { name: 'Top Mid', x: -500, y: 700, radius: 450 },
    { name: 'Suicide', x: -400, y: 400, radius: 350 },
    { name: 'B Site', x: -1700, y: 2500, radius: 500 },
    { name: 'B Doors', x: -1250, y: 2280, radius: 420 },
    { name: 'Window', x: -1350, y: 2700, radius: 350 },
    { name: 'Car', x: -1450, y: 2000, radius: 300 },
    { name: 'Tunnel Exit', x: -2250, y: 2300, radius: 300 },
    { name: 'Upper Tunnels', x: -2020, y: 1650, radius: 480 },
    { name: 'Lower Tunnels', x: -950, y: 1300, radius: 420 },
    { name: 'Outside Tunnels', x: -1700, y: 300, radius: 500 },
    { name: 'T Spawn', x: -800, y: -800, radius: 600 },
    { name: 'Outside T', x: -100, y: 0, radius: 500 },
  ],
  de_inferno: [
    { name: 'A Site', x: 2000, y: 470, radius: 400 },
    { name: 'Pit', x: 1950, y: 120, radius: 300 },
    { name: 'Graveyard', x: 2350, y: 1000, radius: 450 },
    { name: 'Balcony', x: 1600, y: 750, radius: 300 },
    { name: 'Apartments / Boiler', x: 1500, y: 1050, radius: 400 },
    { name: 'Short A', x: 1300, y: 400, radius: 350 },
    { name: 'Long A', x: 1700, y: -100, radius: 450 },
    { name: 'Arch', x: 1000, y: 520, radius: 300 },
    { name: 'Library', x: 1300, y: -50, radius: 350 },
    { name: 'Mid', x: 500, y: 500, radius: 450 },
    { name: 'Second Mid', x: 200, y: 200, radius: 400 },
    { name: 'Banana', x: 150, y: 1100, radius: 350 },
    { name: 'Car', x: 150, y: 1450, radius: 230 },
    { name: 'Logs', x: 350, y: 1750, radius: 250 },
    { name: 'Sandbags', x: 500, y: 2050, radius: 300 },
    { name: 'B Site', x: 315, y: 2730, radius: 500 },
    { name: 'Coffin', x: 150, y: 2650, radius: 250 },
    { name: 'Ruins / Church', x: 900, y: 2550, radius: 450 },
    { name: 'CT Spawn', x: 2400, y: 2100, radius: 500 },
    { name: 'T Spawn', x: -1500, y: 500, radius: 600 },
  ],
  de_nuke: [
    { name: 'A Site', x: -450, y: -850, radius: 450 },
    { name: 'Hut', x: -650, y: -1050, radius: 300 },
    { name: 'Vent', x: -500, y: -1200, radius: 300 },
    { name: 'Silo', x: -600, y: -300, radius: 350 },
    { name: 'Heaven', x: -300, y: -1150, radius: 350 },
    { name: 'Mini / Main', x: -800, y: -850, radius: 350 },
    { name: 'B Site', x: -450, y: -850, radius: 450 },
    { name: 'Ramp', x: -300, y: -1600, radius: 400 },
    { name: 'Radio', x: -350, y: -2100, radius: 350 },
    { name: 'Lobby', x: -800, y: -1800, radius: 450 },
    { name: 'Secret', x: -1500, y: -1700, radius: 400 },
    { name: 'Garage', x: -1600, y: -1000, radius: 400 },
    { name: 'Outside', x: -1300, y: -800, radius: 600 },
    { name: 'CT Spawn', x: -2500, y: -900, radius: 500 },
    { name: 'T Spawn', x: -200, y: -2600, radius: 600 },
  ],
  de_anubis: [
    { name: 'A Site', x: 50, y: 1900, radius: 450 },
    { name: 'Heaven A', x: 200, y: 2200, radius: 350 },
    { name: 'Palace', x: 200, y: 1300, radius: 400 },
    { name: 'B Site', x: -1600, y: 500, radius: 450 },
    { name: 'Connector', x: -1200, y: 900, radius: 350 },
    { name: 'Canal', x: -800, y: 1200, radius: 450 },
    { name: 'Bridge', x: -400, y: 1000, radius: 350 },
    { name: 'Mid', x: -500, y: 800, radius: 400 },
    { name: 'Ruins', x: -1100, y: 500, radius: 350 },
    { name: 'CT Spawn', x: -500, y: 2300, radius: 500 },
    { name: 'T Spawn', x: -400, y: -600, radius: 600 },
  ],
  de_ancient: [
    { name: 'A Site', x: 1600, y: -200, radius: 450 },
    { name: 'Temple', x: 1900, y: 200, radius: 400 },
    { name: 'Donut', x: 800, y: -500, radius: 350 },
    { name: 'Mid', x: 100, y: -400, radius: 450 },
    { name: 'B Site', x: -1400, y: -100, radius: 450 },
    { name: 'Cave', x: -600, y: -200, radius: 350 },
    { name: 'Ramp', x: -1200, y: -1000, radius: 400 },
    { name: 'Alley', x: -1800, y: -300, radius: 400 },
    { name: 'Elbow / Red', x: -400, y: -1000, radius: 350 },
    { name: 'CT Spawn', x: -100, y: 1200, radius: 500 },
    { name: 'T Spawn', x: -100, y: -2200, radius: 600 },
  ],
  de_overpass: [
    { name: 'A Site', x: -1800, y: 300, radius: 450 },
    { name: 'Bank', x: -2200, y: 600, radius: 350 },
    { name: 'Long A', x: -1500, y: 1500, radius: 500 },
    { name: 'Bathrooms / Toilets', x: -1200, y: 700, radius: 400 },
    { name: 'Connector', x: -800, y: 600, radius: 350 },
    { name: 'B Site', x: -800, y: 100, radius: 450 },
    { name: 'Heaven', x: -800, y: -300, radius: 350 },
    { name: 'Short B / Water', x: -200, y: -200, radius: 400 },
    { name: 'Construction', x: -700, y: -400, radius: 400 },
    { name: 'Monster', x: -400, y: -800, radius: 400 },
    { name: 'CT Spawn', x: -2400, y: 300, radius: 500 },
    { name: 'T Spawn', x: -600, y: 2000, radius: 600 },
  ],
};

export function getMapCallouts(map: string): readonly MapCallout[] {
  if (Object.hasOwn(MAP_CALLOUTS, map)) {
    return MAP_CALLOUTS[map as MapId];
  }
  return [];
}

export function findNearestCallout(
  map: string,
  point: { readonly x: number; readonly y: number },
  maxDistance = 500,
): string | null {
  const callouts = getMapCallouts(map);
  if (callouts.length === 0) return null;

  let nearest: MapCallout | null = null;
  let minDistanceSq = Number.POSITIVE_INFINITY;

  for (const callout of callouts) {
    const dx = point.x - callout.x;
    const dy = point.y - callout.y;
    const distSq = dx * dx + dy * dy;
    const allowedRadius = callout.radius ?? maxDistance;
    if (distSq <= allowedRadius * allowedRadius && distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearest = callout;
    }
  }

  return nearest?.name ?? null;
}

export interface CalloutMatch {
  readonly name: string;
  /** True when the point lies outside every callout's own reach and this is only the closest one. */
  readonly isApproximate: boolean;
}

/**
 * How far from a callout's centre a point may be and still be called "near" it: past the callout's
 * own radius, but not so far that the name says nothing about where the point is.
 */
export const APPROXIMATE_CALLOUT_UNITS = 900;

/**
 * What to call a point: the callout it is inside, or failing that the nearest one within
 * `APPROXIMATE_CALLOUT_UNITS`, marked as approximate so the screen can say "≈".
 */
export function calloutAt(
  map: string,
  point: { readonly x: number; readonly y: number },
): CalloutMatch | null {
  const exact = findNearestCallout(map, point);
  if (exact !== null) return { name: exact, isApproximate: false };

  let nearest: MapCallout | null = null;
  let nearestUnits = APPROXIMATE_CALLOUT_UNITS;
  for (const callout of getMapCallouts(map)) {
    const units = Math.hypot(point.x - callout.x, point.y - callout.y);
    if (units <= nearestUnits) {
      nearestUnits = units;
      nearest = callout;
    }
  }

  return nearest === null ? null : { name: nearest.name, isApproximate: true };
}
