import type {
  Frame,
  Lineup,
  LineupTarget,
  LineupVariant,
  MatchLineups,
  ParsedDemo,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { Bookmark, Play, X } from 'lucide-react';
import { useMemo } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { createClockFormat, formatClock } from '@/core/playback';
import { originTitle, type TargetNames, targetTitle } from '../helpers/lineup-names';
import { throwElapsedSeconds } from '../helpers/throw-timing';
import { LineupHowTo } from './LineupHowTo';
import { LineupSave } from './LineupSave';

/** How many names a row of players shows before it says how many more there were. */
const PLAYERS_SHOWN = 2;

/** The most-used targets the empty panel offers. */
const TOP_PICKS = 4;

const HEADING = 'label-dense text-ink-dim';

export interface SaveState {
  readonly saved: Lineup | undefined;
  readonly isSaving: boolean;
  readonly hasFailed: boolean;
  readonly onSave: () => void;
  readonly onEdit: () => void;
  readonly onUndo: () => void;
}

interface Props {
  demo: ParsedDemo;
  lineups: MatchLineups;
  names: ReadonlyMap<string, TargetNames>;
  selected: LineupTarget | null;
  variant: LineupVariant | null;
  savedVariantIds: ReadonlySet<string>;
  save: SaveState;
  onPick: (id: string) => void;
  onVariant: (id: string) => void;
  onClose: () => void;
  onOpenOnStage: (frame: Frame) => void;
}

function Empty({ lineups, names, onPick }: Pick<Props, 'lineups' | 'names' | 'onPick'>) {
  const t = useT();
  const unnamed = t('review.lineups.unnamed');
  const repeated = lineups.targets.filter((target) => target.throwCount > 1).length;

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-16 text-ink leading-snug">
          <Text path="review.lineups.empty.title" />
        </h2>
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="review.lineups.empty.lead" />
        </p>
      </div>

      <ol className="flex list-none flex-col gap-2">
        {(['step1', 'step2', 'step3'] as const).map((step, index) => (
          <li key={step} className="flex items-center gap-2.5 text-13 text-ink">
            <span className="numeric grid size-5.5 shrink-0 place-items-center rounded-full border border-line-strong text-11 font-semibold">
              {index + 1}
            </span>
            <Text path={`review.lineups.empty.${step}`} />
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <p className="flex flex-col gap-0.5 rounded-card bg-surface-2 p-3">
          <span className="numeric font-semibold text-20 text-ink">{lineups.targets.length}</span>
          <span className="text-12 text-ink-dim">
            <Text path="review.lineups.empty.spots" values={{ count: lineups.targets.length }} />
          </span>
        </p>
        <p className="flex flex-col gap-0.5 rounded-card bg-surface-2 p-3">
          <span className="numeric font-semibold text-20 text-ink">{repeated}</span>
          <span className="text-12 text-ink-dim">
            <Text path="review.lineups.empty.repeated" values={{ count: repeated }} />
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className={HEADING}>
          <Text path="review.lineups.empty.top" />
        </h3>
        {lineups.targets.slice(0, TOP_PICKS).map((target) => {
          const targetNames = names.get(target.id);

          return (
            <button
              key={target.id}
              type="button"
              onClick={() => onPick(target.id)}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-card border border-line px-2.5 py-1.5 text-left text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
            >
              <UtilityGlyph kind={target.kind} size="control" />
              <span className="flex-1 font-medium">
                {targetNames === undefined ? unnamed : targetTitle(target, targetNames, unnamed)}
              </span>
              <span className="numeric text-11 text-ink-dim">
                <Text path="review.lineups.throws" values={{ count: target.throwCount }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The right column of the lineups view: nothing picked, it says what to do and offers where to
 * start; a target picked, it lists where it was thrown from and, for the origin chosen, how to
 * repeat it, where to see it in the match, and the press that keeps it.
 */
export function LineupPanel(props: Props) {
  const { demo, names, selected, variant, savedVariantIds, save } = props;
  const t = useT();
  const locale = useLocale();
  const format = useMemo(() => createClockFormat(locale), [locale]);
  const unnamed = t('review.lineups.unnamed');
  const targetNames = selected === null ? undefined : names.get(selected.id);

  const nameOf = (slot: number) =>
    demo.header.players.find((player) => player.slot === slot)?.name ??
    t('review.feed.unknownPlayer');

  const playersOf = (of: LineupVariant): string => {
    const named = of.players.map(nameOf);
    const more = named.length - PLAYERS_SHOWN;

    return more > 0
      ? t('review.lineups.playersMore', { names: named.slice(0, PLAYERS_SHOWN).join(', '), more })
      : named.join(', ');
  };

  return (
    <section
      aria-label={t('review.lineups.panel')}
      className="surface-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-float"
    >
      {selected === null || targetNames === undefined || variant === null ? (
        <Empty lineups={props.lineups} names={names} onPick={props.onPick} />
      ) : (
        <>
          <header className="flex items-center gap-3 [border-block-end:1px_solid_var(--color-line)] px-3.5 pt-3.5 pb-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-card bg-surface-2">
              <UtilityGlyph kind={selected.kind} size="axis" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 className="truncate font-semibold text-16 text-ink">
                {targetTitle(selected, targetNames, unnamed)}
              </h2>
              <span className="numeric truncate text-11 text-ink-dim">
                <Text
                  path="review.lineups.targetMeta"
                  values={{
                    throws: selected.throwCount,
                    side: selected.side === 'BOTH' ? 'T · CT' : selected.side,
                  }}
                />
              </span>
            </span>
            <button
              type="button"
              onClick={props.onClose}
              aria-label={t('review.lineups.close')}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-card text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:bg-hover hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 py-3">
            <div className="flex flex-col gap-1">
              <h3 className={`${HEADING} pb-0.5`}>
                <Text path="review.lineups.origins" values={{ count: selected.variants.length }} />
              </h3>
              {selected.variants.map((candidate, index) => {
                const isOn = candidate.id === variant.id;

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => props.onVariant(candidate.id)}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-card border px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${isOn ? 'border-line-strong bg-selected' : 'border-line hover:bg-hover'}`}
                  >
                    <span
                      className={`numeric grid size-6 shrink-0 place-items-center rounded-full font-semibold text-11 ${isOn ? 'bg-ink text-surface-0' : 'bg-surface-3 text-ink'}`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium text-13 text-ink">
                        {originTitle(candidate, targetNames, unnamed)}
                      </span>
                      <span className="numeric truncate text-11 text-ink-dim">
                        <Text
                          path="review.lineups.variantMeta"
                          values={{
                            type: t(`review.maps.throw.types.${candidate.throwType}`),
                            count: candidate.throws.length,
                            players: playersOf(candidate),
                          }}
                        />
                      </span>
                    </span>
                    {savedVariantIds.has(candidate.id) && (
                      <Bookmark
                        aria-label={t('review.lineups.save.saved')}
                        className="size-3.5 shrink-0 fill-ink text-ink"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <LineupHowTo
              variant={variant}
              from={originTitle(variant, targetNames, unnamed)}
              hz={demo.track.sampleHz}
            />

            <div className="flex flex-col gap-1.5">
              <h3 className={HEADING}>
                <Text path="review.lineups.replay.title" />
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {variant.throws.map(({ thrown }) => {
                  const round = demo.events.rounds[thrown.roundIndex];
                  const time = formatClock(
                    format,
                    round === undefined
                      ? 0
                      : throwElapsedSeconds(thrown, round, demo.track.tickRate),
                  );

                  return (
                    <button
                      key={`${thrown.grenade.throwTick}-${thrown.grenade.thrower}`}
                      type="button"
                      onClick={() => props.onOpenOnStage(thrown.frame)}
                      aria-label={t('review.lineups.replay.watch', {
                        round: thrown.roundIndex + 1,
                        time,
                      })}
                      className="numeric flex h-7 cursor-pointer items-center gap-1.5 rounded-chip border border-line px-2.5 text-12 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
                    >
                      <Play aria-hidden="true" className="size-2.5 fill-current" />
                      <Text
                        path="review.lineups.replay.chip"
                        values={{ round: thrown.roundIndex + 1, time }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <footer className="[border-block-start:1px_solid_var(--color-line)] px-3.5 pt-3 pb-3.5">
            <LineupSave {...save} />
          </footer>
        </>
      )}
    </section>
  );
}
