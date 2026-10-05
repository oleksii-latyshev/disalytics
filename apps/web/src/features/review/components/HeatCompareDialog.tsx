import { collectHeatPoints, type ParsedDemo, type PlayerSlot } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn, Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { useState } from 'react';
import { type MatchRow, matchRows } from '../helpers/heat-matches';
import type { HeatSecond } from '../helpers/heat-view';
import { useComparePicker } from '../hooks/use-compare-picker';

const STEP = 'label-dense text-ink-dim';

const ROW =
  'flex min-h-12 w-full items-center justify-between gap-3 rounded-card border px-3 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out';

interface Props {
  demo: ParsedDemo;
  demoKey: string;
  /** The player already on the left, who cannot be compared with themselves. */
  first: PlayerSlot | null;
  onDismiss: () => void;
  onConfirm: (second: HeatSecond) => void;
}

function rowClass(isChosen: boolean, isDisabled: boolean): string {
  if (isDisabled) return cn(ROW, 'cursor-not-allowed border-line opacity-45');

  return cn(
    ROW,
    'cursor-pointer',
    isChosen ? 'border-line-strong bg-selected' : 'border-line hover:bg-hover',
  );
}

function MatchButton({
  isChosen,
  isDisabled,
  title,
  meta,
  note,
  onPress,
}: {
  isChosen: boolean;
  isDisabled: boolean;
  title: string;
  meta: string;
  note?: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={isChosen}
      onClick={onPress}
      className={rowClass(isChosen, isDisabled)}
    >
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate font-medium text-13 text-ink">{title}</span>
        <span className="numeric truncate text-11 text-ink-dim">{meta}</span>
      </span>
      {note !== undefined && <span className="shrink-0 text-11 text-ink-dim">{note}</span>}
    </button>
  );
}

function Reading({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-card bg-surface-2 px-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-12 text-ink-dim">
        <Text path="review.heat.compare.reading" values={{ match: title }} />
      </span>
      <span
        role="progressbar"
        aria-label={title}
        className="h-1 w-24 shrink-0 animate-pulse rounded-full bg-ink"
      />
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 cursor-pointer rounded-chip px-1 text-12 text-ink underline underline-offset-3"
      >
        <Text path="review.heat.compare.cancel" />
      </button>
    </div>
  );
}

/**
 * Choosing the player to compare with: a match of the library on the same map, or the one on
 * screen, and then a player in it.
 *
 * **The decoded match lives in this dialog and nowhere else.** It is read when it is chosen, the
 * chosen player's points are collected from it when the reader confirms, and closing the dialog
 * unmounts it — what the screen keeps is the points. A match that is no longer on this device says
 * so and says what to do, rather than failing.
 */
export function HeatCompareDialog({ demo, demoKey, first, onDismiss, onConfirm }: Props) {
  const t = useT();
  const picker = useComparePicker({ key: demoKey, demo });
  const { picked } = picker;

  const [chosen, setChosen] = useState<{ key: string; slot: PlayerSlot } | null>(null);

  const rows: readonly MatchRow[] =
    picker.saved === null ? [] : matchRows(picker.saved, { key: demoKey, map: demo.header.map });

  const titleOf = (row: MatchRow): string =>
    row.teams === null
      ? row.fileName
      : t('review.heat.compare.teams', { home: row.teams[0], away: row.teams[1] });

  const pickedRow =
    picked.status === 'idle' ? undefined : rows.find((row) => row.key === picked.key);
  const pickedTitle =
    picked.status !== 'idle' && picked.key === demoKey
      ? t('review.heat.compare.thisMatchRow')
      : pickedRow === undefined
        ? ''
        : titleOf(pickedRow);

  const slot = picked.status === 'ready' && chosen?.key === picked.key ? chosen.slot : null;

  const handleConfirm = () => {
    if (picked.status !== 'ready' || slot === null) return;

    onConfirm({
      points: collectHeatPoints(picked.demo, slot),
      name: picked.demo.header.players.find((each) => each.slot === slot)?.name ?? '',
      origin: picked.key === demoKey ? 'this' : 'library',
    });
  };

  return (
    <Dialog isOpen onDismiss={onDismiss} className="w-full max-w-[32.5rem] gap-3.5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-16 text-ink">
          <Text path="review.heat.compare.title" />
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('review.heat.compare.close')}
          className="grid size-8 cursor-pointer place-items-center rounded-chip text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <h3 className={STEP}>
        <Text path="review.heat.compare.matchStep" />
      </h3>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        <MatchButton
          isChosen={picked.status !== 'idle' && picked.key === demoKey}
          isDisabled={false}
          title={t('review.heat.compare.thisMatchRow')}
          meta={demo.header.map}
          onPress={() => picker.choose(demoKey)}
        />
        {rows.map((row) => (
          <MatchButton
            key={row.key}
            isChosen={picked.status !== 'idle' && picked.key === row.key}
            isDisabled={!row.isSameMap}
            title={titleOf(row)}
            meta={t('review.heat.compare.meta', { map: row.map, score: row.score })}
            {...(row.isSameMap ? {} : { note: t('review.heat.compare.otherMap') })}
            onPress={() => picker.choose(row.key)}
          />
        ))}
      </div>

      {picked.status === 'reading' && <Reading title={pickedTitle} onCancel={picker.cancel} />}
      {picked.status === 'missing' && (
        <p
          role="alert"
          className="rounded-card bg-surface-2 px-3 py-2.5 text-12 text-ink leading-prose"
        >
          <Text path="review.heat.compare.missing" />
        </p>
      )}

      <h3 className={STEP}>
        <Text path="review.heat.compare.playerStep" />
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {picked.status === 'ready' ? (
          picked.demo.header.players.map((player) => (
            <button
              key={player.slot}
              type="button"
              disabled={picked.key === demoKey && player.slot === first}
              aria-pressed={slot === player.slot}
              onClick={() => setChosen({ key: picked.key, slot: player.slot })}
              className={cn(
                'flex h-control cursor-pointer items-center rounded-chip border px-2.5 text-13 transition-colors duration-(--duration-micro) ease-out disabled:cursor-not-allowed disabled:opacity-45',
                slot === player.slot
                  ? 'border-ink bg-ink font-semibold text-surface-0'
                  : 'border-line text-ink-dim hover:text-ink',
              )}
            >
              {player.name}
            </button>
          ))
        ) : (
          <p className="text-12 text-ink-dim">
            <Text path="review.heat.compare.noPlayers" />
          </p>
        )}
      </div>

      <p className="text-11 text-ink-dim leading-prose">
        <Text path="review.heat.compare.note" />
      </p>

      <Button size="lg" disabled={slot === null} onClick={handleConfirm}>
        <Text path="review.heat.compare.confirm" />
      </Button>
    </Dialog>
  );
}
