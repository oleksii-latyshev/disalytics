import { DEFAULT_RADAR_THEME, RADAR_THEMES, type RadarTheme } from '@disa/map-data';

/** Where the scoreboard stands — `docs/DESIGN.md` §5.2. */
export type ScoreboardPosition = 'block' | 'plate';

/** Which grenades draw the 1px flight path §6.2 describes. */
export type TrajectoryVisibility = 'flight' | 'selected' | 'off';

/** `docs/DESIGN.md` §2.4's data colours, or the colour-blind-safe variant beside them. */
export type Palette = 'default' | 'colour-blind';

/** What `prefers-reduced-motion` says, or the reader's own answer over the top of it. */
export type MotionPreference = 'system' | 'reduced' | 'full';

/** How far `←` and `→` move the clock — §9.1. */
export type SeekStepSeconds = 5 | 10 | 15;

/** How much faster a held `←` or `→` moves than a tapped one — §9.1. */
export type HeldArrowRate = 2 | 4;

/**
 * Every preference `docs/DESIGN.md` §10.5 names, except the locale: that one is read before React
 * starts and owned by `@disa/i18n`, which is the package that reads its storage key at boot.
 */
export interface Settings {
  readonly isBuyPhaseSkipped: boolean;
  readonly seekStepSeconds: SeekStepSeconds;
  readonly heldArrowRate: HeldArrowRate;
  readonly radarTheme: RadarTheme;
  readonly isAudibilityShown: boolean;
  readonly arePlayerNamesShown: boolean;
  readonly trajectories: TrajectoryVisibility;
  readonly scoreboard: ScoreboardPosition;
  readonly areSurvivorsShown: boolean;
  readonly palette: Palette;
  readonly motion: MotionPreference;
  readonly isDebugShown: boolean;
}

export type SettingKey = keyof Settings;

interface Descriptor<T> {
  readonly storageKey: string;
  readonly fallback: T;
  /** `undefined` for anything this setting does not recognise, which then falls back. */
  parse(raw: string): T | undefined;
  format(value: T): string;
}

function flag(storageKey: string, fallback: boolean): Descriptor<boolean> {
  return {
    storageKey,
    fallback,
    parse: (raw) => (raw === 'true' ? true : raw === 'false' ? false : undefined),
    format: String,
  };
}

function choice<T extends string>(
  storageKey: string,
  options: readonly T[],
  fallback: T,
): Descriptor<T> {
  return {
    storageKey,
    fallback,
    parse: (raw) => options.find((option) => option === raw),
    format: (value) => value,
  };
}

function numberChoice<T extends number>(
  storageKey: string,
  options: readonly T[],
  fallback: T,
): Descriptor<T> {
  return {
    storageKey,
    fallback,
    parse: (raw) => options.find((option) => String(option) === raw),
    format: String,
  };
}

export const SEEK_STEPS: readonly SeekStepSeconds[] = [5, 10, 15];
export const HELD_ARROW_RATES: readonly HeldArrowRate[] = [2, 4];
export const TRAJECTORY_VISIBILITIES: readonly TrajectoryVisibility[] = [
  'flight',
  'selected',
  'off',
];
export const SCOREBOARD_POSITIONS: readonly ScoreboardPosition[] = ['block', 'plate'];
export const PALETTES: readonly Palette[] = ['default', 'colour-blind'];
export const MOTION_PREFERENCES: readonly MotionPreference[] = ['system', 'reduced', 'full'];

/**
 * One storage key per setting rather than one document: a preference is readable and clearable on
 * its own, and four of these keys were written by earlier issues and keep the names they had.
 */
const DESCRIPTORS: { readonly [K in SettingKey]: Descriptor<Settings[K]> } = {
  isBuyPhaseSkipped: flag('disa.playback.skipBuyPhase', false),
  seekStepSeconds: numberChoice('disa.playback.seekStep', SEEK_STEPS, 10),
  heldArrowRate: numberChoice('disa.playback.heldArrowRate', HELD_ARROW_RATES, 2),
  radarTheme: choice('disa.radar.theme', RADAR_THEMES, DEFAULT_RADAR_THEME),
  isAudibilityShown: flag('disa.radar.audibility', false),
  arePlayerNamesShown: flag('disa.radar.playerNames', true),
  trajectories: choice('disa.radar.trajectories', TRAJECTORY_VISIBILITIES, 'flight'),
  scoreboard: choice('disa.review.scoreboard', SCOREBOARD_POSITIONS, 'block'),
  areSurvivorsShown: flag('disa.timeline.survivors', false),
  palette: choice('disa.palette', PALETTES, 'default'),
  motion: choice('disa.motion', MOTION_PREFERENCES, 'system'),
  isDebugShown: flag('disa.radar.debug', false),
};

export const SETTING_KEYS = Object.keys(DESCRIPTORS) as readonly SettingKey[];

export function storageKeyOf(key: SettingKey): string {
  return DESCRIPTORS[key].storageKey;
}

export const DEFAULT_SETTINGS: Settings = {
  isBuyPhaseSkipped: DESCRIPTORS.isBuyPhaseSkipped.fallback,
  seekStepSeconds: DESCRIPTORS.seekStepSeconds.fallback,
  heldArrowRate: DESCRIPTORS.heldArrowRate.fallback,
  radarTheme: DESCRIPTORS.radarTheme.fallback,
  isAudibilityShown: DESCRIPTORS.isAudibilityShown.fallback,
  arePlayerNamesShown: DESCRIPTORS.arePlayerNamesShown.fallback,
  trajectories: DESCRIPTORS.trajectories.fallback,
  scoreboard: DESCRIPTORS.scoreboard.fallback,
  areSurvivorsShown: DESCRIPTORS.areSurvivorsShown.fallback,
  palette: DESCRIPTORS.palette.fallback,
  motion: DESCRIPTORS.motion.fallback,
  isDebugShown: DESCRIPTORS.isDebugShown.fallback,
};

export type StoredValues = (storageKey: string) => string | null;

function readOne<K extends SettingKey>(key: K, read: StoredValues): Settings[K] {
  const descriptor = DESCRIPTORS[key];
  const raw = read(descriptor.storageKey);

  if (raw === null) return descriptor.fallback;

  return descriptor.parse(raw) ?? descriptor.fallback;
}

/**
 * The settings a store of raw strings describes. A value the descriptor does not recognise falls
 * back rather than failing: a preference written by an older build is not a reason to refuse to
 * open a match.
 */
export function settingsFrom(read: StoredValues): Settings {
  return {
    isBuyPhaseSkipped: readOne('isBuyPhaseSkipped', read),
    seekStepSeconds: readOne('seekStepSeconds', read),
    heldArrowRate: readOne('heldArrowRate', read),
    radarTheme: readOne('radarTheme', read),
    isAudibilityShown: readOne('isAudibilityShown', read),
    arePlayerNamesShown: readOne('arePlayerNamesShown', read),
    trajectories: readOne('trajectories', read),
    scoreboard: readOne('scoreboard', read),
    areSurvivorsShown: readOne('areSurvivorsShown', read),
    palette: readOne('palette', read),
    motion: readOne('motion', read),
    isDebugShown: readOne('isDebugShown', read),
  };
}

export function formatSetting<K extends SettingKey>(key: K, value: Settings[K]): string {
  return DESCRIPTORS[key].format(value);
}
