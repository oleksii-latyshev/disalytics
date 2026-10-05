import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { ChevronDown } from 'lucide-react';
import { LineupCopyButton } from './LineupCopyButton';

export function LineupCoordinatesCollapsible({
  lineup,
  landingCommand,
}: {
  readonly lineup: Lineup;
  readonly landingCommand: string | null;
}) {
  return (
    <details className="group rounded-card border border-line bg-surface-2/60 overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between p-3 select-none text-12 font-medium text-ink transition-colors hover:bg-surface-3/50">
        <span className="flex items-center gap-2">
          <ChevronDown className="size-4 text-ink-dim transition-transform duration-200 group-open:rotate-180" />
          <Text path="library.lineups.coordinatesTitle" />
        </span>
        <span className="rounded-chip border border-ct/30 bg-ct/10 px-2 py-0.5 font-mono text-10 text-ct">
          <Text path="library.lineups.fromDemoNotice" />
        </span>
      </summary>

      <div className="flex flex-col gap-3 [border-block-start:1px_solid_var(--color-line-soft)] p-3 pt-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.coordinatesOrigin" />
          </span>
          <div className="rounded-card border border-line bg-surface-1 p-2 font-mono text-11 text-ink-dim">
            X: {lineup.origin.x.toFixed(1)} · Y: {lineup.origin.y.toFixed(1)}
            {lineup.origin.z !== undefined ? ` · Z: ${lineup.origin.z.toFixed(1)}` : ''}
            <br />
            Pitch: {lineup.pitch.toFixed(1)}° · Yaw: {lineup.yaw.toFixed(1)}°
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.coordinatesLanding" />
          </span>
          <div className="rounded-card border border-line bg-surface-1 p-2 font-mono text-11 text-ink-dim">
            X: {lineup.landing.x.toFixed(1)} · Y: {lineup.landing.y.toFixed(1)}
            {lineup.landing.z !== undefined ? ` · Z: ${lineup.landing.z.toFixed(1)}` : ''}
          </div>
        </div>

        {lineup.waypoints && lineup.waypoints.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="label-dense text-11 text-ink-dim">
              <Text path="library.lineups.waypointsSection" />
            </span>
            <div className="flex flex-col gap-1">
              {lineup.waypoints.map((wp, i) => (
                <div
                  key={`${wp.x}-${wp.y}-${wp.z ?? 0}`}
                  className="flex items-center justify-between rounded-card border border-line bg-surface-1 p-2 font-mono text-11 text-ink-dim"
                >
                  <span className="font-semibold text-ink">#{i + 1}</span>
                  <span>
                    X: {wp.x.toFixed(1)} · Y: {wp.y.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {lineup.command && (
          <div className="flex flex-col gap-1.5">
            <span className="label-dense text-11 text-ink-dim">
              <Text path="library.lineups.commandOrigin" />
            </span>
            <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-1 p-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink">
                {lineup.command}
              </code>
              <LineupCopyButton text={lineup.command}>
                <Text path="library.lineups.copyCommand" />
              </LineupCopyButton>
            </div>
          </div>
        )}

        {landingCommand && (
          <div className="flex flex-col gap-1.5">
            <span className="label-dense text-11 text-ink-dim">
              <Text path="library.lineups.commandLanding" />
            </span>
            <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-1 p-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink">
                {landingCommand}
              </code>
              <LineupCopyButton text={landingCommand}>
                <Text path="library.lineups.copyLandingCommand" />
              </LineupCopyButton>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
