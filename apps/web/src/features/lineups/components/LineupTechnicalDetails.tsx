import { Text } from '@disa/i18n';
import { Input } from '@disa/ui';
import type { LineupFormValues } from '../helpers/lineup-form-model';

type UpdateValue = <K extends keyof LineupFormValues>(key: K, value: LineupFormValues[K]) => void;

export function LineupTechnicalDetails({
  values,
  hasDemoCommand,
  updateValue,
  updateLandingCoord,
}: {
  readonly values: LineupFormValues;
  readonly hasDemoCommand: boolean;
  readonly updateValue: UpdateValue;
  readonly updateLandingCoord: (axis: 'landingX' | 'landingY' | 'landingZ', value: string) => void;
}) {
  return (
    <details className="rounded-card border border-line bg-surface-1 p-3">
      <summary className="cursor-pointer label-dense text-ink-dim">
        <Text path="library.lineups.form.technicalDetails" />
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {/* Coordinates: Origin, Landing, Angles */}
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-1 p-3">
          {!hasDemoCommand && (
            <p className="text-11 text-ink-dim leading-prose">
              <Text path="library.lineups.form.mapCoordinatesNote" />
            </p>
          )}
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.form.origin" />
          </span>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={values.originX}
              onChange={(e) => updateValue('originX', e.target.value)}
              placeholder="X"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
            <input
              type="text"
              value={values.originY}
              onChange={(e) => updateValue('originY', e.target.value)}
              placeholder="Y"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
            <input
              type="text"
              value={values.originZ}
              onChange={(e) => updateValue('originZ', e.target.value)}
              placeholder="Z"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
          </div>

          <span className="label-dense text-11 text-ink-dim mt-1">
            <Text path="library.lineups.form.landing" />
          </span>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={values.landingX}
              onChange={(e) => updateLandingCoord('landingX', e.target.value)}
              placeholder="X"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
            <input
              type="text"
              value={values.landingY}
              onChange={(e) => updateLandingCoord('landingY', e.target.value)}
              placeholder="Y"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
            <input
              type="text"
              value={values.landingZ}
              onChange={(e) => updateLandingCoord('landingZ', e.target.value)}
              placeholder="Z"
              className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex flex-col gap-1">
              <span className="label-dense text-10 text-ink-dim">
                <Text path="library.lineups.form.pitch" />
              </span>
              <input
                type="text"
                value={values.pitch}
                onChange={(e) => updateValue('pitch', e.target.value)}
                placeholder="Pitch"
                className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="label-dense text-10 text-ink-dim">
                <Text path="library.lineups.form.yaw" />
              </span>
              <input
                type="text"
                value={values.yaw}
                onChange={(e) => updateValue('yaw', e.target.value)}
                placeholder="Yaw"
                className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
              />
            </div>
          </div>
        </div>

        {/* Console Command (Only for demo-derived lineups) */}
        {values.fromDemo && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lineup-command" className="label-dense text-ink-dim">
                <Text path="library.lineups.form.command" />
              </label>
              <Input
                id="lineup-command"
                type="text"
                value={values.command}
                onChange={(e) => updateValue('command', e.target.value)}
                placeholder="setpos ...; setang ..."
                className="font-mono text-11"
              />
            </div>
            {values.landingCommand && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lineup-landing-command" className="label-dense text-ink-dim">
                  <Text path="library.lineups.commandLanding" />
                </label>
                <Input
                  id="lineup-landing-command"
                  type="text"
                  value={values.landingCommand}
                  onChange={(e) => updateValue('landingCommand', e.target.value)}
                  placeholder="setpos ..."
                  className="font-mono text-11"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
