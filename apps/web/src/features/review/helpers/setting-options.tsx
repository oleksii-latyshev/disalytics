import { LOCALES, type LocalePreference, Text } from '@disa/i18n';
import { DEFAULT_RADAR_THEME, RADAR_THEMES, type RadarTheme } from '@disa/map-data';
import {
  HELD_ARROW_RATES,
  type HeldArrowRate,
  LOOKS,
  type LookId,
  MOTION_PREFERENCES,
  type MotionPreference,
  PALETTES,
  type Palette,
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

// A plate's name is product vocabulary and is translated, which is the one place §11's line falls
// on the other side from a map's: `Mirage` is Counter-Strike's word and reaches a Russian reader
// unchanged, where `blue` is this repository's word for a set of images it generates itself and
// names nothing in the game. The default leads, the way the row is written, rather than in whatever
// order the package declares them.
export const THEME_OPTIONS: readonly ChoiceOption<RadarTheme>[] = [
  DEFAULT_RADAR_THEME,
  ...RADAR_THEMES.filter((theme) => theme !== DEFAULT_RADAR_THEME),
].map((theme) => ({ value: theme, label: <Text path={`settings.radarTheme.${theme}`} /> }));

/**
 * The look, and the palette it is half of. Both are named in the reader's own language — a look is
 * this repository's word for an arrangement it ships, the way a plate's name is, and neither names
 * anything in the game (§11).
 */
export const LOOK_OPTIONS: readonly ChoiceOption<LookId>[] = LOOKS.map((look) => ({
  value: look.id,
  label: <Text path={`settings.look.${look.id}`} />,
}));

export const PALETTE_OPTIONS: readonly ChoiceOption<Palette>[] = PALETTES.map((palette) => ({
  value: palette,
  label: <Text path={`settings.palette.${palette}`} />,
}));

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
