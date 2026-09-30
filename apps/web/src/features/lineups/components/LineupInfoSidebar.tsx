import { type Lineup, UTILITY_NAMES } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { ExternalLink } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { LineupCoordinatesCollapsible } from './LineupCoordinatesCollapsible';

const SIDE_STYLES: Readonly<Record<Lineup['side'], string>> = {
  CT: 'text-ct border-ct/30 bg-ct/10',
  T: 'text-t border-t/30 bg-t/10',
  BOTH: 'text-ink border-line bg-surface-3',
};

function LineupExplanation({
  instructions,
  notes,
}: {
  readonly instructions?: string | undefined;
  readonly notes?: string | undefined;
}) {
  if (!instructions && !notes) return null;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3.5">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.explanation" />
      </span>
      {instructions && <p className="text-13 font-medium text-ink leading-prose">{instructions}</p>}
      {notes && <p className="text-12 text-ink-dim leading-prose">{notes}</p>}
    </div>
  );
}

function LineupMovementCard({ movementKeys }: { readonly movementKeys: readonly string[] }) {
  if (movementKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-2 p-3.5">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.movement" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {movementKeys.map((key) => (
          <kbd
            key={key}
            className="rounded-chip border border-line bg-surface-3 px-2.5 py-1 font-mono font-medium text-12 text-ink shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function LineupInfoSidebar({
  lineup,
  landingCommand,
  isFromDemo,
  mediaUrl,
}: {
  readonly lineup: Lineup;
  readonly landingCommand: string | null;
  readonly isFromDemo: boolean;
  readonly mediaUrl: string | null;
}) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden [border-block-start:1px_solid_var(--color-line)] bg-surface-1 p-4 sm:p-5 lg:w-[22rem] lg:flex-none lg:[border-block-start:0] lg:[border-inline-start:1px_solid_var(--color-line)] xl:w-[24rem]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.detailsTitle" />
          </span>
          {mediaUrl && (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
            >
              <ExternalLink className="size-3.5" />
              <Text path="library.lineups.media" />
            </a>
          )}
        </div>

        <h2 className="font-ui font-medium text-16 text-ink leading-dense break-words">
          {lineup.title}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-chip border px-2 py-0.5 font-medium text-11 ${
              SIDE_STYLES[lineup.side]
            }`}
          >
            {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
          </span>

          <span className="flex items-center gap-1 rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink">
            <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
            <span>{UTILITY_NAMES[lineup.kind]}</span>
          </span>

          <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink-dim">
            <Text path={`review.maps.throw.types.${lineup.throwType}`} />
          </span>

          <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink-dim">
            <Text path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'} />
          </span>
        </div>
      </div>

      <LineupExplanation instructions={lineup.movementInstructions} notes={lineup.notes} />

      <LineupMovementCard movementKeys={lineup.movementKeys ?? []} />

      {lineup.mouseButtons && lineup.mouseButtons.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3.5">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.mouseButtons" />
          </span>
          <div className="flex flex-wrap gap-2">
            {lineup.mouseButtons.map((button) => (
              <kbd
                key={button}
                className="rounded-chip border border-line bg-surface-3 px-2.5 py-1 font-mono text-12 text-ink"
              >
                <Text path={`library.lineups.form.mouse.${button}`} />
              </kbd>
            ))}
          </div>
        </div>
      )}

      {isFromDemo && (
        <LineupCoordinatesCollapsible lineup={lineup} landingCommand={landingCommand} />
      )}
    </div>
  );
}
