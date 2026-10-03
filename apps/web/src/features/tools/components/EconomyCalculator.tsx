import {
  type EnemyRoundObservation,
  estimateEnemyRounds,
  oppositeSide,
  sideAtRound,
  type Team,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useEffect, useRef, useState } from 'react';
import { choiceClass, formatMoneyRange, newObservation } from '../helpers/economy-draft';
import {
  readSession,
  type SavedSession,
  type TrackedRound,
  writeSession,
} from '../helpers/economy-session';
import { EconomyHistory } from './EconomyHistory';
import { EconomyInputPanel } from './EconomyInputPanel';
import { EconomyOutputPanel } from './EconomyOutputPanel';

export function EconomyCalculator() {
  const t = useT();
  const locale = useLocale();
  const savedSession = useRef<SavedSession | null>(null);
  const initialSession = savedSession.current ?? readSession();
  savedSession.current = initialSession;
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  const formatRange = (floor: number, ceiling: number): string =>
    formatMoneyRange(money, floor, ceiling);
  const [openingSide, setOpeningSide] = useState<Team>(initialSession.openingSide);
  const [rounds, setRounds] = useState<readonly TrackedRound[]>(initialSession.rounds);
  const nextId = useRef(initialSession.rounds.length + 1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [draft, setDraft] = useState<EnemyRoundObservation>(() =>
    newObservation(sideAtRound(initialSession.openingSide, initialSession.rounds.length + 1)),
  );

  useEffect(() => {
    writeSession({ openingSide, rounds });
  }, [openingSide, rounds]);

  const roundNumber = editingIndex === null ? rounds.length + 1 : editingIndex + 1;
  const ourSide = sideAtRound(openingSide, roundNumber);
  const opponent = oppositeSide(ourSide);
  const estimates = estimateEnemyRounds(
    rounds.map((round, index) => ({
      ...round,
      ourSide: sideAtRound(openingSide, index + 1),
    })),
  );
  const latest = estimates.at(-1);
  const approximateMoney =
    latest === undefined
      ? null
      : formatRange(latest.estimatedNextCashFloorPerPlayer, latest.estimatedNextCashPerPlayer);

  const saveRound = () => {
    const id = editingIndex === null ? nextId.current++ : rounds[editingIndex]?.id;
    if (id === undefined) return;
    const observation: TrackedRound = { ...draft, ourSide, id };
    setRounds((previous) =>
      editingIndex === null
        ? [...previous, observation]
        : previous.map((round, index) => (index === editingIndex ? observation : round)),
    );
    setEditingIndex(null);
    setDraft(
      newObservation(sideAtRound(openingSide, rounds.length + (editingIndex === null ? 2 : 1))),
    );
  };

  const editRound = (index: number) => {
    const observation = rounds[index];
    if (observation === undefined) return;
    setDraft(observation);
    setEditingIndex(index);
  };

  const removeRound = (index: number) => {
    setRounds((previous) => previous.filter((_, roundIndex) => roundIndex !== index));
    setEditingIndex(null);
    setDraft(newObservation(sideAtRound(openingSide, rounds.length)));
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraft(newObservation(sideAtRound(openingSide, rounds.length + 1)));
  };

  const resetSession = () => {
    setRounds([]);
    setOpeningSide('CT');
    setEditingIndex(null);
    setDraft(newObservation('CT'));
    nextId.current = 1;
    setConfirmReset(false);
  };

  return (
    <section aria-label={t('library.tools.economy.title')}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-11 tracking-[0.14em] text-ink-dim uppercase">
            <Text path="library.tools.economy.eyebrow" />
          </p>
          <h3 className="text-20 font-medium tracking-[-0.035em]">
            <Text path="library.tools.economy.title" />
          </h3>
          <p className="mt-2 max-w-[60ch] text-13 text-ink-dim leading-prose">
            <Text path="library.tools.economy.note" />
          </p>
        </div>
        <div className="flex items-center gap-2 text-12 text-ink-dim">
          <Text path="library.tools.economy.startSide" />
          {(['CT', 'T'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setOpeningSide(side)}
              aria-pressed={openingSide === side}
              className={choiceClass(openingSide === side)}
            >
              {side}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(310px,0.82fr)]">
        <EconomyInputPanel
          draft={draft}
          setDraft={setDraft}
          roundNumber={roundNumber}
          ourSide={ourSide}
          opponent={opponent}
          isEditing={editingIndex !== null}
          onSave={saveRound}
          onCancelEdit={cancelEdit}
        />

        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <EconomyOutputPanel latest={latest} money={money} approximateMoney={approximateMoney} />

          {rounds.length > 0 && (
            <EconomyHistory
              rounds={rounds}
              estimates={estimates}
              formatRange={formatRange}
              isConfirmingReset={confirmReset}
              onAskReset={() => setConfirmReset(true)}
              onConfirmReset={resetSession}
              onCancelReset={() => setConfirmReset(false)}
              onEdit={editRound}
              onRemove={removeRound}
            />
          )}
        </div>
      </div>
    </section>
  );
}
