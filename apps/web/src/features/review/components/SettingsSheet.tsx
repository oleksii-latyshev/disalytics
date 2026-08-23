import {
  LOCALES,
  type LocalePreference,
  Text,
  type TranslationKey,
  useLocalePreference,
  useT,
} from '@disa/i18n';
import { RADAR_THEMES } from '@disa/map-data';
import { Button, Sheet, Switch } from '@disa/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
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
  useSetting,
  useSettingToggle,
} from '@/core/settings';
import { type ChoiceOption, SettingChoice } from './SettingChoice';
import { SettingRow } from './SettingRow';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
}

const SEEK_STEP_OPTIONS: readonly ChoiceOption<SeekStepSeconds>[] = SEEK_STEPS.map((seconds) => ({
  value: seconds,
  label: <Text path="settings.seekStep.option" values={{ seconds }} />,
}));

const HELD_ARROW_OPTIONS: readonly ChoiceOption<HeldArrowRate>[] = HELD_ARROW_RATES.map((rate) => ({
  value: rate,
  label: <Text path="settings.heldArrowRate.option" values={{ rate }} />,
}));

// Map and theme names are game vocabulary — AGENTS.md §11 — so `blue` and `vanilla` reach the
// screen as they are rather than through a key that would have to be translated twice.
const THEME_OPTIONS: readonly ChoiceOption<(typeof RADAR_THEMES)[number]>[] = RADAR_THEMES.map(
  (theme) => ({ value: theme, label: theme }),
);

const TRAJECTORY_OPTIONS: readonly ChoiceOption<TrajectoryVisibility>[] =
  TRAJECTORY_VISIBILITIES.map((visibility) => ({
    value: visibility,
    label: <Text path={`settings.trajectories.${visibility}`} />,
  }));

const SCOREBOARD_OPTIONS: readonly ChoiceOption<ScoreboardPosition>[] = SCOREBOARD_POSITIONS.map(
  (position) => ({ value: position, label: <Text path={`settings.scoreboard.${position}`} /> }),
);

const MOTION_OPTIONS: readonly ChoiceOption<MotionPreference>[] = MOTION_PREFERENCES.map(
  (preference) => ({
    value: preference,
    label: <Text path={`settings.motion.${preference}`} />,
  }),
);

// A language is named in its own language, which is why both locale files carry the same string
// for each of these: a reader looking for Russian is not helped by the English word for it.
const LANGUAGE_OPTIONS: readonly ChoiceOption<LocalePreference>[] = [
  { value: 'system', label: <Text path="settings.language.system" /> },
  ...LOCALES.map((locale) => ({
    value: locale,
    label: <Text path={`settings.language.${locale}`} />,
  })),
];

function Group({ titlePath, children }: { titlePath: TranslationKey; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="label-dense text-ink-dim">
        <Text path={titlePath} />
      </h3>

      {children}
    </section>
  );
}

/**
 * DESIGN.md §10.5's sheet, and every row of its table. Each one is read where it is *obeyed* — the
 * plate reads its own four, the round strip reads its own — so this file holds the copy, the
 * grouping and the controls, and nothing else knows the sheet exists.
 *
 * **Playback is stopped while the sheet is open** — `MatchReview` pauses on the way in, which is
 * what makes covering the plate legitimate under principle 4 rather than an exception to it.
 *
 * The sheet had a footer for one day: leaving the demo landed here on 17 August because the corner
 * cluster had no seat for a control §10.5 does not name, and left again on 18 August because §10.5
 * not naming it was the point. Settings are settings; a route out of the match is `LeaveMatch`, in
 * the top-left corner where a reader looks for back.
 */
export function SettingsSheet({ isOpen, onDismiss }: Props) {
  const t = useT();
  const language = useLocalePreference();

  const [isBuyPhaseSkipped, toggleBuyPhaseSkip] = useSettingToggle('isBuyPhaseSkipped');
  const [seekStepSeconds, setSeekStep] = useSetting('seekStepSeconds');
  const [heldArrowRate, setHeldArrowRate] = useSetting('heldArrowRate');
  const [radarTheme, setRadarTheme] = useSetting('radarTheme');
  const [isAudibilityShown, toggleAudibility] = useSettingToggle('isAudibilityShown');
  const [arePlayerNamesShown, togglePlayerNames] = useSettingToggle('arePlayerNamesShown');
  const [trajectories, setTrajectories] = useSetting('trajectories');
  const [scoreboard, setScoreboard] = useSetting('scoreboard');
  const [areSurvivorsShown, toggleSurvivors] = useSettingToggle('areSurvivorsShown');
  const [palette, setPalette] = useSetting('palette');
  const [motion, setMotion] = useSetting('motion');
  const [isDebugShown, toggleDebug] = useSettingToggle('isDebugShown');

  return (
    <Sheet isOpen={isOpen} onDismiss={onDismiss} aria-label={t('settings.title')}>
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-8 p-8">
        <header className="flex items-start justify-between gap-6">
          <h2 className="font-ui text-28 leading-dense">
            <Text path="settings.title" />
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('settings.dismiss')}
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <Group titlePath="settings.group.playback">
          <SettingRow
            labelPath="settings.skipBuyPhase.label"
            notePath="settings.skipBuyPhase.note"
            control={
              <Switch
                checked={isBuyPhaseSkipped}
                onChange={toggleBuyPhaseSkip}
                aria-label={t('settings.skipBuyPhase.label')}
              />
            }
          />

          <SettingRow
            labelPath="settings.seekStep.label"
            notePath="settings.seekStep.note"
            control={
              <SettingChoice
                labelPath="settings.seekStep.label"
                value={seekStepSeconds}
                options={SEEK_STEP_OPTIONS}
                onChange={setSeekStep}
              />
            }
          />

          <SettingRow
            labelPath="settings.heldArrowRate.label"
            notePath="settings.heldArrowRate.note"
            control={
              <SettingChoice
                labelPath="settings.heldArrowRate.label"
                value={heldArrowRate}
                options={HELD_ARROW_OPTIONS}
                onChange={setHeldArrowRate}
              />
            }
          />
        </Group>

        <Group titlePath="settings.group.plate">
          <SettingRow
            labelPath="settings.radarTheme.label"
            notePath="settings.radarTheme.note"
            control={
              <SettingChoice
                labelPath="settings.radarTheme.label"
                value={radarTheme}
                options={THEME_OPTIONS}
                onChange={setRadarTheme}
              />
            }
          />

          <SettingRow
            labelPath="settings.audibility.label"
            notePath="settings.audibility.note"
            control={
              <Switch
                checked={isAudibilityShown}
                onChange={toggleAudibility}
                aria-label={t('settings.audibility.label')}
              />
            }
          />

          <SettingRow
            labelPath="settings.playerNames.label"
            notePath="settings.playerNames.note"
            control={
              <Switch
                checked={arePlayerNamesShown}
                onChange={togglePlayerNames}
                aria-label={t('settings.playerNames.label')}
              />
            }
          />

          <SettingRow
            labelPath="settings.trajectories.label"
            notePath="settings.trajectories.note"
            control={
              <SettingChoice
                labelPath="settings.trajectories.label"
                value={trajectories}
                options={TRAJECTORY_OPTIONS}
                onChange={setTrajectories}
              />
            }
          />
        </Group>

        <Group titlePath="settings.group.interface">
          <SettingRow
            labelPath="settings.scoreboard.label"
            notePath="settings.scoreboard.note"
            control={
              <SettingChoice
                labelPath="settings.scoreboard.label"
                value={scoreboard}
                options={SCOREBOARD_OPTIONS}
                onChange={setScoreboard}
              />
            }
          />

          <SettingRow
            labelPath="settings.survivors.label"
            notePath="settings.survivors.note"
            control={
              <Switch
                checked={areSurvivorsShown}
                onChange={toggleSurvivors}
                aria-label={t('settings.survivors.label')}
              />
            }
          />

          <SettingRow
            labelPath="settings.language.label"
            notePath="settings.language.note"
            control={
              <SettingChoice
                labelPath="settings.language.label"
                value={language.preference}
                options={LANGUAGE_OPTIONS}
                onChange={language.choose}
              />
            }
          />

          <SettingRow
            labelPath="settings.motion.label"
            notePath="settings.motion.note"
            control={
              <SettingChoice
                labelPath="settings.motion.label"
                value={motion}
                options={MOTION_OPTIONS}
                onChange={setMotion}
              />
            }
          />
        </Group>

        <Group titlePath="settings.group.colour">
          <SettingRow
            labelPath="settings.palette.label"
            notePath="settings.palette.note"
            control={
              <Switch
                checked={palette === 'colour-blind'}
                onChange={() => setPalette(palette === 'colour-blind' ? 'default' : 'colour-blind')}
                aria-label={t('settings.palette.label')}
              />
            }
          />
        </Group>

        <Group titlePath="settings.group.developer">
          <SettingRow
            labelPath="settings.debug.label"
            notePath="settings.debug.note"
            control={
              <Switch
                checked={isDebugShown}
                onChange={toggleDebug}
                aria-label={t('settings.debug.label')}
              />
            }
          />
        </Group>
      </div>
    </Sheet>
  );
}
