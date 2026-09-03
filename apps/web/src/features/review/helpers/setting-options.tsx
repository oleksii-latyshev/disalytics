import { LOCALES, type LocalePreference, Text } from '@disa/i18n';
import { DEFAULT_RADAR_THEME, RADAR_THEMES, type RadarTheme } from '@disa/map-data';
import {
  HELD_ARROW_RATES,
  type HeldArrowRate,
  MOTION_PREFERENCES,
  type MotionPreference,
  SCOREBOARD_POSITIONS,
  type ScoreboardPosition,
  SEEK_STEPS,
  type SeekStepSeconds,
  TRAJECTORY_VISIBILITIES,
  type TrajectoryVisibility,
} from '@/core/settings';
import type { ChoiceOption } from '../components/SettingChoice';

/**
 * What each choosing row of the settings table offers, in the order the sheet lays them out. The
 * sheet is where they are laid out; this is what they say.
 */
export const SEEK_STEP_OPTIONS: readonly ChoiceOption<SeekStepSeconds>[] = SEEK_STEPS.map(
  (seconds) => ({
    value: seconds,
    label: <Text path="settings.seekStep.option" values={{ seconds }} />,
  }),
);

export const HELD_ARROW_OPTIONS: readonly ChoiceOption<HeldArrowRate>[] = HELD_ARROW_RATES.map(
  (rate) => ({
    value: rate,
    label: <Text path="settings.heldArrowRate.option" values={{ rate }} />,
  }),
);

// Map and theme names are game vocabulary — AGENTS.md §11 — so `blue` and `vanilla` reach the
// screen as they are rather than through a key that would have to be translated twice. The default
// leads, the way the row is written, rather than in whatever order the package declares them.
export const THEME_OPTIONS: readonly ChoiceOption<RadarTheme>[] = [
  DEFAULT_RADAR_THEME,
  ...RADAR_THEMES.filter((theme) => theme !== DEFAULT_RADAR_THEME),
].map((theme) => ({ value: theme, label: theme }));

export const TRAJECTORY_OPTIONS: readonly ChoiceOption<TrajectoryVisibility>[] =
  TRAJECTORY_VISIBILITIES.map((visibility) => ({
    value: visibility,
    label: <Text path={`settings.trajectories.${visibility}`} />,
  }));

export const SCOREBOARD_OPTIONS: readonly ChoiceOption<ScoreboardPosition>[] =
  SCOREBOARD_POSITIONS.map((position) => ({
    value: position,
    label: <Text path={`settings.scoreboard.${position}`} />,
  }));

export const MOTION_OPTIONS: readonly ChoiceOption<MotionPreference>[] = MOTION_PREFERENCES.map(
  (preference) => ({
    value: preference,
    label: <Text path={`settings.motion.${preference}`} />,
  }),
);

// A language is named in its own language, which is why both locale files carry the same string
// for each of these: a reader looking for Russian is not helped by the English word for it.
export const LANGUAGE_OPTIONS: readonly ChoiceOption<LocalePreference>[] = [
  { value: 'system', label: <Text path="settings.language.system" /> },
  ...LOCALES.map((locale) => ({
    value: locale,
    label: <Text path={`settings.language.${locale}`} />,
  })),
];
