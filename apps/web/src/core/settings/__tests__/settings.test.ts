import { describe, expect, it } from 'vitest';
import { applyDocumentSettings, documentSettings } from '../helpers/document';
import { DEFAULT_SETTINGS, type Settings, settingsFrom } from '../helpers/settings';
import { createSettingsStore } from '../helpers/store';

function reader(values: Record<string, string>) {
  return (key: string) => values[key] ?? null;
}

describe('settingsFrom', () => {
  it('falls back for everything a device has never stored', () => {
    expect(settingsFrom(reader({}))).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the keys the earlier issues wrote', () => {
    const stored = settingsFrom(
      reader({
        'disa.radar.audibility': 'true',
        'disa.review.scoreboard': 'plate',
        'disa.radar.debug': 'true',
        'disa.timeline.survivors': 'true',
      }),
    );

    expect(stored.isAudibilityShown).toBe(true);
    expect(stored.scoreboard).toBe('plate');
    expect(stored.isDebugShown).toBe(true);
    expect(stored.areSurvivorsShown).toBe(true);
  });

  it('falls back rather than failing on a value it does not recognise', () => {
    const stored = settingsFrom(
      reader({
        'disa.radar.theme': 'chartreuse',
        'disa.playback.seekStep': '7',
        'disa.motion': '',
      }),
    );

    expect(stored.radarTheme).toBe(DEFAULT_SETTINGS.radarTheme);
    expect(stored.seekStepSeconds).toBe(10);
    expect(stored.motion).toBe('system');
  });

  it('reads the numeric choices back as numbers', () => {
    const stored = settingsFrom(
      reader({ 'disa.playback.seekStep': '15', 'disa.playback.heldArrowRate': '4' }),
    );

    expect(stored.seekStepSeconds).toBe(15);
    expect(stored.heldArrowRate).toBe(4);
  });
});

describe('documentSettings', () => {
  function withSettings(patch: Partial<Settings>): Settings {
    return { ...DEFAULT_SETTINGS, ...patch };
  }

  it('names no attribute for the defaults', () => {
    expect(documentSettings(DEFAULT_SETTINGS)).toEqual({ palette: null, motionReduce: null });
  });

  it('leaves reduced motion to the media query while the reader has not answered', () => {
    expect(documentSettings(withSettings({ motion: 'system' })).motionReduce).toBeNull();
    expect(documentSettings(withSettings({ motion: 'reduced' })).motionReduce).toBe('on');
    expect(documentSettings(withSettings({ motion: 'full' })).motionReduce).toBe('off');
  });

  it('names the palette only when it is not the default one', () => {
    expect(documentSettings(withSettings({ palette: 'colour-blind' })).palette).toBe(
      'colour-blind',
    );
  });

  it('does nothing at all without a document', () => {
    expect(() => applyDocumentSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});

describe('createSettingsStore', () => {
  it('writes through to storage under its own key', () => {
    const saved: Record<string, string> = {};
    const store = createSettingsStore(reader({}), (key, value) => {
      saved[key] = value;
    });

    store.write('radarTheme', 'vanilla');
    store.write('seekStepSeconds', 15);

    expect(saved).toEqual({ 'disa.radar.theme': 'vanilla', 'disa.playback.seekStep': '15' });
    expect(store.read().radarTheme).toBe('vanilla');
  });

  it('tells its listeners once per change and not at all for a write of the same value', () => {
    const store = createSettingsStore(reader({}), () => {});
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.write('isDebugShown', true);
    store.write('isDebugShown', true);
    expect(calls).toBe(1);

    unsubscribe();
    store.write('isDebugShown', false);
    expect(calls).toBe(1);
  });

  it('holds the preference for the session when there is no storage at all', () => {
    const store = createSettingsStore();

    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    expect(() => store.write('palette', 'colour-blind')).not.toThrow();
    expect(store.read().palette).toBe('colour-blind');
  });
});
