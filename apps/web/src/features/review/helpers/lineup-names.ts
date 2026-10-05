import type { LineupTarget, LineupVariant, UtilityKind } from '@disa/demo-core';
import { type CalloutMatch, calloutAt } from '@disa/map-data';

/**
 * What a lineup's kind is called in play: the short names a player says ("smoke Xbox"), which are
 * game vocabulary and so never translated (`AGENTS.md` §11). `UTILITY_NAMES` carries the full item
 * names, which are too long for a list row.
 */
export const LINEUP_KIND_NAMES: Readonly<Record<UtilityKind, string>> = {
  smoke: 'Smoke',
  flash: 'Flash',
  fire: 'Molotov',
  he: 'HE',
  decoy: 'Decoy',
  kit: 'Defuse Kit',
};

/** What naming needs of a target, so a test need not build a whole one. */
export interface NameableTarget extends Pick<LineupTarget, 'id' | 'kind' | 'landing'> {
  readonly variants: readonly Pick<LineupVariant, 'id' | 'origin'>[];
}

export interface TargetNames {
  readonly target: CalloutMatch | null;
  /** By variant id. */
  readonly origins: ReadonlyMap<string, CalloutMatch | null>;
  /** Lower-cased, so a search is one `includes`. */
  readonly searchText: string;
}

/** A callout as it is said: "Xbox", or "≈ Xbox" when the point only lies near it. */
export function calloutLabel(match: CalloutMatch | null): string | null {
  if (match === null) return null;

  return match.isApproximate ? `≈ ${match.name}` : match.name;
}

/** Every target's and origin's callout, read once per demo rather than on a press. */
export function nameLineups(
  map: string,
  targets: readonly NameableTarget[],
): ReadonlyMap<string, TargetNames> {
  return new Map(
    targets.map((target) => {
      const origins = new Map(
        target.variants.map((variant) => [variant.id, calloutAt(map, variant.origin)] as const),
      );
      const targetName = calloutAt(map, target.landing);
      const searchText = [
        targetName?.name,
        LINEUP_KIND_NAMES[target.kind],
        ...[...origins.values()].map((match) => match?.name),
      ]
        .filter((part) => part !== undefined)
        .join(' ')
        .toLowerCase();

      return [target.id, { target: targetName, origins, searchText }] as const;
    }),
  );
}

/** "Smoke · Xbox": what a target is called wherever it is listed, with `unnamed` where no callout holds it. */
export function targetTitle(
  target: Pick<LineupTarget, 'kind'>,
  names: TargetNames,
  unnamed: string,
): string {
  return `${LINEUP_KIND_NAMES[target.kind]} · ${calloutLabel(names.target) ?? unnamed}`;
}

/** Where a variant was thrown from, as a callout, or `unnamed`. */
export function originTitle(
  variant: Pick<LineupVariant, 'id'>,
  names: TargetNames,
  unnamed: string,
): string {
  return calloutLabel(names.origins.get(variant.id) ?? null) ?? unnamed;
}
