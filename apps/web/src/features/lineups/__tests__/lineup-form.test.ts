import { describe, expect, it } from 'vitest';
import {
  buildLineupFromForm,
  initFormValues,
  type LineupFormData,
  type LineupFormValues,
  reorderLineupPhotos,
} from '../components/LineupFormModal';
import { basicValidationKey } from '../helpers/lineup-form-model';

describe('lineup form helpers', () => {
  it('creates empty default form values when no initialData is provided', () => {
    const values = initFormValues(null, 'de_inferno');
    expect(values.map).toBe('de_inferno');
    expect(values.title).toBe('');
    expect(values.side).toBe('T');
    expect(values.kind).toBe('smoke');
    expect(values.throwType).toBe('jump');
    expect(values.movementKeys).toEqual(['Jump']);
    expect(values.mouseButtons).toEqual(['left']);
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
      mouseButtons: ['left', 'right'],
      command: 'setpos -120.46 -450.12 -100.00; setang -18.25 89.12 0',
    };

    const values = initFormValues(demoThrowData, 'de_dust2');
    expect(values.title).toBe('s1mple Mirage Window Smoke');
    expect(values.map).toBe('de_mirage');
    expect(values.side).toBe('T');
    expect(values.kind).toBe('smoke');
    expect(values.throwType).toBe('jump');
    expect(values.movementKeys).toEqual(['W', 'Jump']);
    expect(values.mouseButtons).toEqual(['left', 'right']);
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
      targetCallout: 'B Site',
      side: 'CT',
      kind: 'flash',
      throwType: 'stand',
      movementKeys: ['Stand'],
      mouseButtons: ['left', 'right'],
      movementInstructions: 'Take two steps while holding Shift',
      imageUrls: ['https://example.com/one.webp', 'https://example.com/two.webp'],
      imageCaptions: ['Stand here', 'Aim here'],
      originX: '-500.50',
      originY: '250.25',
      originZ: '10.00',
      landingX: '-300.00',
      landingY: '400.00',
      landingZ: '0.00',
      pitch: '-30.50',
      yaw: '45.00',
      command: 'custom setpos',
      landingCommand: 'setpos -300.00 400.00 0.00',
      fromDemo: true,
      notes: 'Throw over fence',
      mediaUrl: 'https://example.com/lineup.png',
      tags: [],
      authorName: '',
      authorUrl: '',
    };

    const lineup = buildLineupFromForm(values, 'custom-123', 1000);
    expect(lineup).not.toBeNull();
    if (!lineup) return;

    expect(lineup.id).toBe('custom-123');
    expect(lineup.title).toBe('B Site Flash');
    expect(lineup.map).toBe('de_dust2');
    expect(lineup.targetCallout).toBe('B Site');
    expect(lineup.side).toBe('CT');
    expect(lineup.kind).toBe('flash');
    expect(lineup.throwType).toBe('stand');
    expect(lineup.movementKeys).toEqual(['Stand']);
    expect(lineup.mouseButtons).toEqual(['left', 'right']);
    expect(lineup.movementKeysSummary).toBe('Stand');
    expect(lineup.movementInstructions).toBe('Take two steps while holding Shift');
    expect(lineup.imageUrls).toEqual([
      'https://example.com/one.webp',
      'https://example.com/two.webp',
    ]);
    expect(lineup.imageCaptions).toEqual(['Stand here', 'Aim here']);
    expect(lineup.origin).toEqual({ x: -500.5, y: 250.25, z: 10 });
    expect(lineup.landing).toEqual({ x: -300, y: 400, z: 0 });
    expect(lineup.pitch).toBe(-30.5);
    expect(lineup.yaw).toBe(45);
    expect(lineup.command).toBe('custom setpos');
    expect(lineup.landingCommand).toBe('setpos -300.00 400.00 0.00');
    expect(lineup.fromDemo).toBe(true);
    expect(lineup.notes).toBe('Throw over fence');
    expect(lineup.mediaUrl).toBe('https://example.com/lineup.png');
    expect(lineup.isBuiltIn).toBe(false);
    expect(lineup.createdAt).toBe(1000);

    const reordered = reorderLineupPhotos(values, 0, 1);
    expect(reordered.imageUrls).toEqual([
      'https://example.com/two.webp',
      'https://example.com/one.webp',
    ]);
    expect(reordered.imageCaptions).toEqual(['Aim here', 'Stand here']);
  });

  it('compiles setpos and setang command automatically when fromDemo is true and command is blank', () => {
    const values: LineupFormValues = {
      title: 'Auto Command Lineup',
      map: 'de_nuke',
      targetCallout: '',
      side: 'BOTH',
      kind: 'he',
      throwType: 'jump',
      movementKeys: ['W', 'Shift', 'Jump'],
      mouseButtons: ['left'],
      movementInstructions: '',
      imageUrls: [],
      imageCaptions: [],
      originX: '10.00',
      originY: '20.00',
      originZ: '30.00',
      landingX: '40.00',
      landingY: '50.00',
      landingZ: '60.00',
      pitch: '-15.00',
      yaw: '90.00',
      command: '',
      landingCommand: '',
      fromDemo: true,
      notes: '',
      mediaUrl: '',
      tags: [],
      authorName: '',
      authorUrl: '',
    };

    const lineup = buildLineupFromForm(values);
    expect(lineup).not.toBeNull();
    if (!lineup) return;

    expect(lineup.command).toBe('setpos 10.00 20.00 30.00; setang -15.00 90.00 0');
    expect(lineup.landingCommand).toBe('setpos 40.00 50.00 60.00');
    expect(lineup.fromDemo).toBe(true);
    expect(lineup.movementKeysSummary).toBe('W + Shift + Jump');
    expect(lineup.isBuiltIn).toBe(false);
    expect(lineup.id.startsWith('custom-')).toBe(true);

    const mapPlaced = buildLineupFromForm(
      { ...values, fromDemo: false },
      undefined,
      undefined,
      false,
    );
    expect(mapPlaced?.command).toBe('');
    expect(mapPlaced?.landingCommand).toBeUndefined();
    expect(mapPlaced?.fromDemo).toBeUndefined();
  });

  it('returns null if coordinates are not finite numbers', () => {
    const values: LineupFormValues = {
      title: 'Invalid Lineup',
      map: 'de_dust2',
      targetCallout: '',
      side: 'T',
      kind: 'smoke',
      throwType: 'stand',
      movementKeys: ['Stand'],
      mouseButtons: ['left'],
      movementInstructions: '',
      imageUrls: [],
      imageCaptions: [],
      originX: 'invalid',
      originY: '20.00',
      originZ: '30.00',
      landingX: '40.00',
      landingY: '50.00',
      landingZ: '60.00',
      pitch: '0',
      yaw: '0',
      command: '',
      landingCommand: '',
      fromDemo: false,
      notes: '',
      mediaUrl: '',
      tags: [],
      authorName: '',
      authorUrl: '',
    };

    const lineup = buildLineupFromForm(values);
    expect(lineup).toBeNull();
  });

  it('auto-detects callout from landing coordinates if not explicitly provided', () => {
    const data: LineupFormData = {
      title: 'Mirage Window Smoke',
      map: 'de_mirage',
      origin: { x: -120, y: -450, z: -100 },
      landing: { x: -1050, y: -350, z: -100 },
    };
    const values = initFormValues(data);
    expect(values.targetCallout).toBe('Window');

    const explicitData: LineupFormData = {
      ...data,
      targetCallout: 'Custom Callout',
    };
    const explicitValues = initFormValues(explicitData);
    expect(explicitValues.targetCallout).toBe('Custom Callout');
  });

  it('preserves and parses waypoints, groupId, and originGroupId', () => {
    const data: LineupFormData = {
      title: 'Mirage Flash with Bounce',
      map: 'de_mirage',
      origin: { x: -100, y: -200, z: 0 },
      landing: { x: -300, y: -400, z: 0 },
      waypoints: [
        { x: -150, y: -250, z: 10 },
        { x: -200, y: -300, z: 20 },
      ],
      groupId: 'grp-42',
      originGroupId: 'org-7',
    };

    const values = initFormValues(data);
    expect(values.waypoints).toHaveLength(2);
    expect(values.waypoints?.[0]?.x).toBe('-150.00');
    expect(values.waypoints?.[1]?.x).toBe('-200.00');
    expect(values.groupId).toBe('grp-42');
    expect(values.originGroupId).toBe('org-7');

    const lineup = buildLineupFromForm(values, 'test-bounce');
    expect(lineup).not.toBeNull();
    if (!lineup) return;

    expect(lineup.waypoints).toEqual([
      { x: -150, y: -250, z: 10 },
      { x: -200, y: -300, z: 20 },
    ]);
    expect(lineup.groupId).toBe('grp-42');
    expect(lineup.originGroupId).toBe('org-7');
    expect(lineup.groupTarget).toBeUndefined();
  });

  it('carries tags and author through the form and back out', () => {
    const values = initFormValues({
      map: 'de_mirage',
      title: 'Window',
      origin: { x: 1, y: 2, z: 0 },
      landing: { x: 3, y: 4, z: 0 },
      tags: ['meta'],
      author: { name: 'Ann', url: 'https://steamcommunity.com/id/ann' },
    });
    expect(values.tags).toEqual(['meta']);
    expect(values.authorName).toBe('Ann');
    const lineup = buildLineupFromForm(values, 'x');
    expect(lineup?.tags).toEqual(['meta']);
    expect(lineup?.author).toEqual({ name: 'Ann', url: 'https://steamcommunity.com/id/ann' });
  });

  it('leaves tags and author off when empty, and trims a name-only author', () => {
    const values = { ...initFormValues(null), title: 'T', authorName: ' Ann ' };
    const lineup = buildLineupFromForm(values, 'x');
    expect(lineup?.tags).toBeUndefined();
    expect(lineup?.author).toEqual({ name: 'Ann' });
    const bare = buildLineupFromForm({ ...initFormValues(null), title: 'T' }, 'y');
    expect(bare).not.toHaveProperty('tags');
    expect(bare).not.toHaveProperty('author');
  });

  it('validates the author before saving', () => {
    const ok = { ...initFormValues(null), title: 'T' };
    expect(basicValidationKey(ok)).toBeNull();
    expect(
      basicValidationKey({ ...ok, authorName: 'Ann', authorUrl: 'https://a.example/x' }),
    ).toBeNull();
    expect(basicValidationKey({ ...ok, authorUrl: 'https://a.example/x' })).toBe(
      'library.lineups.form.validation.authorNameRequired',
    );
    expect(basicValidationKey({ ...ok, authorName: 'Ann', authorUrl: 'http://a.example' })).toBe(
      'library.lineups.form.validation.authorUrlInvalid',
    );
  });
});
