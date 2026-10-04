import {
  type EnemyRoundObservation,
  estimateEnemyRounds,
  oppositeSide,
  sideAtRound,
  type Team,
} from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { useEffect, useRef, useState } from 'react';
import { formatMoneyRange, newObservation } from '../helpers/economy-draft';
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
    <section
      aria-label={t('library.tools.economy.title')}
      className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch xl:grid-cols-[17rem_minmax(0,1fr)_minmax(20rem,26rem)]"
    >
      <div className="order-2 flex min-w-0 flex-col lg:order-1 lg:col-span-2 xl:col-span-1">
        <EconomyHistory
          rounds={rounds}
          openingSide={openingSide}
          onOpeningSide={setOpeningSide}
          roundNumber={roundNumber}
          editingIndex={editingIndex}
          isConfirmingReset={confirmReset}
          onAskReset={() => setConfirmReset(true)}
          onConfirmReset={resetSession}
          onCancelReset={() => setConfirmReset(false)}
          onEdit={editRound}
        />
      </div>

      <div className="order-3 flex min-w-0 flex-col lg:order-2">
        <EconomyInputPanel
          draft={draft}
          setDraft={setDraft}
          roundNumber={roundNumber}
          ourSide={ourSide}
          opponent={opponent}
          isEditing={editingIndex !== null}
          onSave={saveRound}
          onCancelEdit={cancelEdit}
          onRemove={() => {
            if (editingIndex !== null) removeRound(editingIndex);
          }}
        />
      </div>

      <div className="order-1 min-w-0 lg:order-3">
        <div className="lg:sticky lg:top-4">
          <EconomyOutputPanel latest={latest} money={money} approximateMoney={approximateMoney} />
        </div>
      </div>
    </section>
  );
}
