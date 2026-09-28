import type { Frame, ParsedDemo, PlayerSlot, Team, UtilityThrow } from '@disa/demo-core';
import { UTILITY_NAMES, utilityKindOfGrenade } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { Play, X } from 'lucide-react';
import { useMemo } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { createClockFormat } from '@/core/playback';
import type { ThrowCluster } from '../helpers/throw-cluster';
import { formatThrowTiming } from '../helpers/throw-timing';

interface Props {
  readonly isOpen: boolean;
  readonly cluster: ThrowCluster | null;
  readonly throws: readonly UtilityThrow[];
  readonly demo: ParsedDemo;
  readonly onDismiss: () => void;
  readonly onOpenOnStage: (frame: Frame) => void;
}

const SIDE_INK: Readonly<Record<Team, string>> = { CT: 'text-ct', T: 'text-t' };

export function ClusterThrowsModal({
  isOpen,
  cluster,
  throws,
  demo,
  onDismiss,
  onOpenOnStage,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const format = useMemo(() => createClockFormat(locale), [locale]);
  const { players } = demo.header;

  const nameOf = (slot: PlayerSlot) =>
    players.find((player) => player.slot === slot)?.name ?? t('review.feed.unknownPlayer');

  const clusterThrows = useMemo(() => {
    if (cluster === null) return [];
    return cluster.indices
      .map((idx) => throws[idx])
      .filter((thrown): thrown is UtilityThrow => thrown !== undefined);
  }, [cluster, throws]);

  return (
    <Dialog isOpen={isOpen} onDismiss={onDismiss} className="w-full max-w-[36rem] p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="font-ui text-16 font-medium text-ink">
          <Text path="review.maps.cluster.title" values={{ count: clusterThrows.length }} />
        </h3>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('review.maps.cluster.close')}
          className="rounded-chip p-1 text-ink-dim transition-colors hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid max-h-[60vh] gap-2 overflow-y-auto">
        {clusterThrows.map((thrown) => {
          const utility = utilityKindOfGrenade(thrown.grenade.type);
          const round = demo.events.rounds[thrown.roundIndex];
          const timingText =
            round !== undefined ? formatThrowTiming(thrown, round, demo, format) : '';

          return (
            <div
              key={`throw-${thrown.grenade.throwTick}-${thrown.grenade.thrower}`}
              className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-1 p-2.5 transition-colors hover:bg-surface-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-chip bg-surface-2">
                  <UtilityGlyph kind={utility} label={UTILITY_NAMES[utility]} size="control" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-13 font-medium ${
                        thrown.throwerSide === undefined ? 'text-ink' : SIDE_INK[thrown.throwerSide]
                      }`}
                    >
                      {nameOf(thrown.grenade.thrower)}
                    </span>
                    {thrown.throwerSide !== undefined && (
                      <span className={`text-11 font-semibold ${SIDE_INK[thrown.throwerSide]}`}>
                        {thrown.throwerSide}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-11 text-ink-dim">
                    <span>
                      <Text
                        path="review.maps.roundNumber"
                        values={{ round: thrown.roundIndex + 1 }}
                      />
                    </span>
                    {timingText !== '' && (
                      <>
                        <span>•</span>
                        <span className="numeric">{timingText}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={() => {
                  onDismiss();
                  onOpenOnStage(thrown.frame);
                }}
                className="flex shrink-0 items-center gap-1.5 text-12 text-ink hover:bg-surface-3"
              >
                <Play className="size-3 fill-current" />
                <Text path="review.maps.cluster.watchOnStage" />
              </Button>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
