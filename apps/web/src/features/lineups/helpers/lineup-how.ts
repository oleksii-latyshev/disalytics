import type { Lineup, LineupMouseButton, MovementKey } from '@disa/demo-core';
import { calloutAt } from '@disa/map-data';

/** Where to stand: the callout the origin is in, with `≈` when it is only near one, else the lineup's own name. */
export function standLabel(map: string, lineup: Lineup): string {
  const near = calloutAt(map, lineup.origin);
  if (near === null) return lineup.title;

  return near.isApproximate ? `≈ ${near.name}` : near.name;
}

/** The keys held for the throw: `Stand` is the absence of any, so it is never shown as a key. */
export function heldKeys(lineup: Lineup): readonly MovementKey[] {
  return lineup.movementKeys.filter((key) => key !== 'Stand');
}

/** The mouse buttons the throw uses; a plain left press is what everyone assumes and is not said. */
export function spokenButtons(lineup: Lineup): readonly LineupMouseButton[] {
  const buttons = lineup.mouseButtons ?? [];

  return buttons.length === 1 && buttons[0] === 'left' ? [] : buttons;
}
