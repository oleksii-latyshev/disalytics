import { asPlayerSlot, type PlayerSlot } from '@disa/demo-core';
import type { Translate } from '@disa/i18n';
import { describe, expect, it } from 'vitest';
import { killName } from '../helpers/name';
import type { KillRow } from '../helpers/row';

// The real catalogue, for the five keys this reads. Asserting against `en` rather than against the
// key names is what makes the joining visible: a mark is its own sentence, not a clause.
const MESSAGES: Readonly<Record<string, string>> = {
  'events.kill.byPlayer': '{attacker} kills {victim} with {weapon}',
  'events.kill.byWorld': '{victim} dies',
  'events.kill.headshot': 'Headshot',
  'events.kill.wallbang': 'Through a wall',
  'events.kill.throughSmoke': 'Through smoke',
};

const t: Translate = (path, values) =>
  (MESSAGES[path] ?? path).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ''));

const nameOf = (slot: PlayerSlot | null): string => (slot === null ? 'Unknown' : `P${slot}`);

function kill(over: Partial<KillRow> = {}): KillRow {
  return {
    attacker: asPlayerSlot(1),
    victim: asPlayerSlot(2),
    attackerSide: 'CT',
    victimSide: 'T',
    weapon: 'rifle',
    weaponIcon: 'ak47',
    weaponName: 'AK-47',
    isHeadshot: false,
    isWallbang: false,
    isThroughSmoke: false,
    ...over,
  };
}

describe('killName', () => {
  it('names the attacker, the victim and the weapon', () => {
    expect(killName(kill(), nameOf, t)).toBe('P1 kills P2 with AK-47');
  });

  it('names no weapon when the world did the killing', () => {
    expect(killName(kill({ attacker: null }), nameOf, t)).toBe('P2 dies');
  });

  it('appends every mark the kill carries, in one fixed order', () => {
    const marked = kill({ isHeadshot: true, isWallbang: true, isThroughSmoke: true });

    expect(killName(marked, nameOf, t)).toBe(
      'P1 kills P2 with AK-47. Headshot. Through a wall. Through smoke',
    );
  });

  it('appends only the marks that are set', () => {
    expect(killName(kill({ isThroughSmoke: true }), nameOf, t)).toBe(
      'P1 kills P2 with AK-47. Through smoke',
    );
  });

  // A world kill carries the marks the schema gave it, and the row draws none of them — the name is
  // where they are said, so it must not drop them with the weapon.
  it('keeps the marks on a world kill', () => {
    expect(killName(kill({ attacker: null, isHeadshot: true }), nameOf, t)).toBe(
      'P2 dies. Headshot',
    );
  });
});
