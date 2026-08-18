import { Text, type TranslationKey, useT } from '@disa/i18n';
import { Button, Sheet, Switch } from '@disa/ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
  isAudibilityShown: boolean;
  onAudibilityToggle: () => void;
  isScoreboardOnPlate: boolean;
  onScoreboardPositionToggle: () => void;
  isDebugShown: boolean;
  onDebugToggle: () => void;
}

interface RowProps {
  labelPath: TranslationKey;
  notePath: TranslationKey;
  control: ReactNode;
}

/**
 * One setting: what it is, what choosing it costs, and the control. The note is not decoration —
 * every row in §10.5 that has a real cost says so, and the scoreboard's is the clearest case in the
 * product, since choosing the plate is what spends §2.3's one blur exception.
 */
function SettingRow({ labelPath, notePath, control }: RowProps) {
  return (
    <div className="flex min-h-control-lg items-start justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-15">
          <Text path={labelPath} />
        </span>
        <span className="text-13 text-ink-dim leading-prose">
          <Text path={notePath} />
        </span>
      </div>

      {control}
    </div>
  );
}

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
 * DESIGN.md §10.5's sheet, carrying the three settings the review layout parked in the corner cluster
 * (#147, #196, #199) and nothing else — the rest of §10.5's table is §15's step 9. The cluster is
 * three named buttons again, which is what #151 was for.
 *
 * **Playback is stopped while the sheet is open** — `MatchReview` pauses on the way in, which is
 * what makes covering the plate legitimate under principle 4 rather than an exception to it.
 *
 * The sheet had a footer for one day: leaving the demo landed here on 17 August because the corner
 * cluster had no seat for a control §10.5 does not name, and left again on 18 August because §10.5
 * not naming it was the point. Settings are settings; a route out of the match is `LeaveMatch`, in
 * the top-left corner where a reader looks for back.
 */
export function SettingsSheet({
  isOpen,
  onDismiss,
  isAudibilityShown,
  onAudibilityToggle,
  isScoreboardOnPlate,
  onScoreboardPositionToggle,
  isDebugShown,
  onDebugToggle,
}: Props) {
  const t = useT();

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

        <Group titlePath="settings.group.plate">
          <SettingRow
            labelPath="settings.audibility.label"
            notePath="settings.audibility.note"
            control={
              <Switch
                checked={isAudibilityShown}
                onChange={onAudibilityToggle}
                aria-label={t('settings.audibility.label')}
              />
            }
          />
        </Group>

        <Group titlePath="settings.group.interface">
          <SettingRow
            labelPath="settings.scoreboard.label"
            notePath="settings.scoreboard.note"
            control={
              // Two named positions rather than an on/off: §10.5 writes this setting as a choice
              // between the block and the plate, and "off" would not say which one it left.
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant={isScoreboardOnPlate ? 'ghost' : 'secondary'}
                  aria-pressed={!isScoreboardOnPlate}
                  onClick={isScoreboardOnPlate ? onScoreboardPositionToggle : undefined}
                >
                  <Text path="settings.scoreboard.onBlock" />
                </Button>

                <Button
                  type="button"
                  variant={isScoreboardOnPlate ? 'secondary' : 'ghost'}
                  aria-pressed={isScoreboardOnPlate}
                  onClick={isScoreboardOnPlate ? undefined : onScoreboardPositionToggle}
                >
                  <Text path="settings.scoreboard.onPlate" />
                </Button>
              </div>
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
                onChange={onDebugToggle}
                aria-label={t('settings.debug.label')}
              />
            }
          />
        </Group>
      </div>
    </Sheet>
  );
}
