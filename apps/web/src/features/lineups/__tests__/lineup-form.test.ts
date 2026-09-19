import { describe, expect, it } from 'vitest';
import {
  buildLineupFromForm,
  initFormValues,
  type LineupFormData,
  type LineupFormValues,
} from '../components/LineupFormModal';

describe('lineup form helpers', () => {
  it('creates empty default form values when no initialData is provided', () => {
    const values = initFormValues(null, 'de_inferno');
    expect(values.map).toBe('de_inferno');
    expect(values.title).toBe('');
    expect(values.side).toBe('T');
    expect(values.kind).toBe('smoke');
    expect(values.throwType).toBe('jump');
    expect(values.movementKeys).toEqual(['Jump']);
    expect(values.originX).toBe('0');
    expect(values.command).toBe('');
  });

  it('populates form values correctly from partial lineup data or demo throw', () => {
    const demoThrowData: LineupFormData = {
      title: 's1mple Mirage Window Smoke',
      map: 'de_mirage',
      side: 'T',
      kind: 'smoke',
      origin: { x: -120.456, y: -450.123, z: -100 },
      landing: { x: -300.999, y: 50.555, z: 20 },
      pitch: -18.25,
      yaw: 89.12,
      throwType: 'jump',
      movementKeys: ['W', 'Jump'],
      command: 'setpos -120.46 -450.12 -100.00; setang -18.25 89.12 0',
    };

    const values = initFormValues(demoThrowData, 'de_dust2');
    expect(values.title).toBe('s1mple Mirage Window Smoke');
    expect(values.map).toBe('de_mirage');
    expect(values.side).toBe('T');
    expect(values.kind).toBe('smoke');
    expect(values.throwType).toBe('jump');
    expect(values.movementKeys).toEqual(['W', 'Jump']);
    expect(values.originX).toBe('-120.46');
    expect(values.originY).toBe('-450.12');
    expect(values.originZ).toBe('-100.00');
    expect(values.landingX).toBe('-301.00');
    expect(values.landingY).toBe('50.55');
    expect(values.landingZ).toBe('20.00');
    expect(values.pitch).toBe('-18.25');
    expect(values.yaw).toBe('89.12');
    expect(values.command).toBe('setpos -120.46 -450.12 -100.00; setang -18.25 89.12 0');
  });

  it('builds a valid Lineup object from form values', () => {
    const values: LineupFormValues = {
      title: 'B Site Flash',
      map: 'de_dust2',
      side: 'CT',
      kind: 'flash',
      throwType: 'stand',
      movementKeys: ['Stand'],
      originX: '-500.50',
      originY: '250.25',
      originZ: '10.00',
      landingX: '-300.00',
      landingY: '400.00',
      landingZ: '0.00',
      pitch: '-30.50',
      yaw: '45.00',
      command: 'custom setpos',
      notes: 'Throw over fence',
      mediaUrl: 'https://example.com/lineup.png',
    };

    const lineup = buildLineupFromForm(values, 'custom-123', 1000);
    expect(lineup).not.toBeNull();
    if (!lineup) return;

    expect(lineup.id).toBe('custom-123');
    expect(lineup.title).toBe('B Site Flash');
    expect(lineup.map).toBe('de_dust2');
    expect(lineup.side).toBe('CT');
    expect(lineup.kind).toBe('flash');
    expect(lineup.throwType).toBe('stand');
    expect(lineup.movementKeys).toEqual(['Stand']);
    expect(lineup.movementKeysSummary).toBe('Stand');
    expect(lineup.origin).toEqual({ x: -500.5, y: 250.25, z: 10 });
    expect(lineup.landing).toEqual({ x: -300, y: 400, z: 0 });
    expect(lineup.pitch).toBe(-30.5);
    expect(lineup.yaw).toBe(45);
    expect(lineup.command).toBe('custom setpos');
    expect(lineup.notes).toBe('Throw over fence');
    expect(lineup.mediaUrl).toBe('https://example.com/lineup.png');
    expect(lineup.isBuiltIn).toBe(false);
    expect(lineup.createdAt).toBe(1000);
  });

  it('compiles setpos and setang command automatically when command is blank', () => {
    const values: LineupFormValues = {
      title: 'Auto Command Lineup',
      map: 'de_nuke',
      side: 'BOTH',
      kind: 'he',
      throwType: 'jump',
      movementKeys: ['W', 'Shift', 'Jump'],
      originX: '10.00',
      originY: '20.00',
      originZ: '30.00',
      landingX: '40.00',
      landingY: '50.00',
      landingZ: '60.00',
      pitch: '-15.00',
      yaw: '90.00',
      command: '',
      notes: '',
      mediaUrl: '',
    };

    const lineup = buildLineupFromForm(values);
    expect(lineup).not.toBeNull();
    if (!lineup) return;

    expect(lineup.command).toBe('setpos 10.00 20.00 30.00; setang -15.00 90.00 0');
    expect(lineup.movementKeysSummary).toBe('W + Shift + Jump');
    expect(lineup.isBuiltIn).toBe(false);
    expect(lineup.id.startsWith('custom-')).toBe(true);
  });

  it('returns null if coordinates are not finite numbers', () => {
    const values: LineupFormValues = {
      title: 'Invalid Lineup',
      map: 'de_dust2',
      side: 'T',
      kind: 'smoke',
      throwType: 'stand',
      movementKeys: ['Stand'],
      originX: 'invalid',
      originY: '20.00',
      originZ: '30.00',
      landingX: '40.00',
      landingY: '50.00',
      landingZ: '60.00',
      pitch: '0',
      yaw: '0',
      command: '',
      notes: '',
      mediaUrl: '',
    };

    const lineup = buildLineupFromForm(values);
    expect(lineup).toBeNull();
  });
});
