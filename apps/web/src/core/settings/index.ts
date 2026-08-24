export type {
  HeldArrowRate,
  MotionPreference,
  Palette,
  ScoreboardPosition,
  SeekStepSeconds,
  SettingKey,
  Settings,
  TrajectoryVisibility,
} from './helpers/settings';
export {
  DEFAULT_SETTINGS,
  HELD_ARROW_RATES,
  MOTION_PREFERENCES,
  PALETTES,
  SCOREBOARD_POSITIONS,
  SEEK_STEPS,
  TRAJECTORY_VISIBILITIES,
} from './helpers/settings';
export { useSetting, useSettingToggle } from './hooks/use-setting';
