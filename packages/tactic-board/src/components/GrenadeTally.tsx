import { GRENADE_KINDS, type GrenadeCounts, UTILITY_NAMES } from '@disa/demo-core';
import { UtilityGlyph } from '@disa/plate';

/** The grenades of a loadout as glyph and count pairs, leaving out the kinds not used. */
export function GrenadeTally({ counts }: { readonly counts: GrenadeCounts }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {GRENADE_KINDS.filter((kind) => counts[kind] > 0).map((kind) => (
        <span
          key={kind}
          className="flex items-center gap-1 font-mono text-12 text-ink tabular-nums"
          title={UTILITY_NAMES[kind]}
        >
          <UtilityGlyph kind={kind} label={UTILITY_NAMES[kind]} size="control" />
          {counts[kind]}
        </span>
      ))}
    </span>
  );
}
