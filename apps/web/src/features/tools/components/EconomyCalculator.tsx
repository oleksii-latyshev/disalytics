import {
  changeObservedWeaponCount,
  countObservedWeapons,
  type EnemyRoundObservation,
  emptyWeaponObservations,
  estimateEnemyRounds,
  OBSERVED_WEAPONS,
  type ObservedWeapon,
  type RoundEndReason,
  type Team,
} from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { useEffect, useRef, useState } from 'react';

const COUNTS = [0, 1, 2, 3, 4, 5] as const;

type TrackedRound = EnemyRoundObservation & { readonly id: number };
type SavedSession = { readonly openingSide: Team; readonly rounds: readonly TrackedRound[] };

const STORAGE_KEY = 'disa.enemyEconomy.v1';
const EMPTY_SESSION: SavedSession = { openingSide: 'CT', rounds: [] };
const REASONS: readonly RoundEndReason[] = [
  'elimination',
  'bomb-defused',
  'bomb-exploded',
  'time-expired',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0 && value <= 5;
}

function isReason(value: unknown): value is RoundEndReason {
  return REASONS.some((reason) => reason === value);
}

function parseWeapons(value: unknown): Record<ObservedWeapon, number> | null {
  if (!isRecord(value)) return null;
  const weapons: Record<ObservedWeapon, number> = { ...emptyWeaponObservations() };
  for (const weapon of OBSERVED_WEAPONS) {
    const count = value[weapon];
    if (!isCount(count)) return null;
    weapons[weapon] = count;
  }
  return countObservedWeapons(weapons) <= 5 ? weapons : null;
}

function parseRound(value: unknown, id: number): TrackedRound | null {
  if (!isRecord(value)) return null;
  const weapons = parseWeapons(value.weapons);
  if (weapons === null || (value.ourSide !== 'CT' && value.ourSide !== 'T')) return null;
  if (typeof value.weWon !== 'boolean' || !isReason(value.reason)) return null;
  if (value.enemySurvivors !== null && !isCount(value.enemySurvivors)) return null;
  if (value.enemyKills !== null && !isCount(value.enemyKills)) return null;
  if (value.bombPlanted !== null && typeof value.bombPlanted !== 'boolean') return null;
  return {
    id,
    ourSide: value.ourSide,
    weWon: value.weWon,
    reason: value.reason,
    enemySurvivors: value.enemySurvivors,
    enemyKills: value.enemyKills,
    bombPlanted: value.bombPlanted,
    weapons,
  };
}

function readSession(): SavedSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY_SESSION;
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || (saved.openingSide !== 'CT' && saved.openingSide !== 'T')) {
      return EMPTY_SESSION;
    }
    if (!Array.isArray(saved.rounds) || saved.rounds.length > 256) return EMPTY_SESSION;

    const rawRounds: readonly unknown[] = saved.rounds;
    const rounds: TrackedRound[] = [];
    for (const value of rawRounds) {
      const round = parseRound(value, rounds.length + 1);
      if (round === null) return EMPTY_SESSION;
      rounds.push(round);
    }
    return { openingSide: saved.openingSide, rounds };
  } catch {
    return EMPTY_SESSION;
  }
}

const REASON_PATHS = {
  elimination: 'library.tools.economy.elimination',
  'bomb-defused': 'library.tools.economy.bombDefused',
  'bomb-exploded': 'library.tools.economy.bombExploded',
  'time-expired': 'library.tools.economy.timeExpired',
} as const;

const WEAPON_LABELS = {
  ak47: { name: 'AK-47' },
  m4: { name: 'M4' },
  smg: { path: 'library.tools.economy.weaponSmg' },
  awp: { name: 'AWP' },
  shotgun: { path: 'library.tools.economy.weaponShotgun' },
  pistol: { path: 'library.tools.economy.weaponPistol' },
  other: { path: 'library.tools.economy.otherWeapon' },
} as const;

const ASSUMPTION_PATHS = {
  unknownWeapons: 'library.tools.economy.assumptions.unknownWeapons',
  survivorCarry: 'library.tools.economy.assumptions.survivorCarry',
  unpricedEquipment: 'library.tools.economy.assumptions.unpricedEquipment',
  unknownKills: 'library.tools.economy.assumptions.unknownKills',
  genericKillReward: 'library.tools.economy.assumptions.genericKillReward',
  unknownPlant: 'library.tools.economy.assumptions.unknownPlant',
  otherUnpriced: 'library.tools.economy.assumptions.otherUnpriced',
  unknownSurvivors: 'library.tools.economy.assumptions.unknownSurvivors',
} as const;

function enemySide(ourSide: Team): Team {
  return ourSide === 'CT' ? 'T' : 'CT';
}

function ourSideAtRound(openingSide: Team, round: number): Team {
  if (round <= 12) return openingSide;
  const switches = 1 + Math.floor(Math.max(0, round - 25) / 3);
  return switches % 2 === 0 ? openingSide : enemySide(openingSide);
}

function newObservation(ourSide: Team): EnemyRoundObservation {
  return {
    ourSide,
    weWon: true,
    reason: 'elimination',
    enemySurvivors: 0,
    bombPlanted: null,
    enemyKills: null,
    weapons: emptyWeaponObservations(),
  };
}

function choiceClass(selected: boolean): string {
  return (
    'min-h-11 rounded-chip border px-3 py-2 text-12 transition-colors ' +
    (selected
      ? 'border-ink bg-ink text-surface-0'
      : 'border-line bg-surface-2 text-ink-dim hover:border-line-strong hover:text-ink')
  );
}

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
    floor === ceiling
      ? money.format(ceiling)
      : `${money.format(floor)}–${money.format(Math.round(ceiling / 100) * 100)}`;
  const [openingSide, setOpeningSide] = useState<Team>(initialSession.openingSide);
  const [rounds, setRounds] = useState<readonly TrackedRound[]>(initialSession.rounds);
  const nextId = useRef(initialSession.rounds.length + 1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<EnemyRoundObservation>(() =>
    newObservation(ourSideAtRound(initialSession.openingSide, initialSession.rounds.length + 1)),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ openingSide, rounds }));
    } catch {
      // The calculator remains usable when browser storage is unavailable.
    }
  }, [openingSide, rounds]);

  const roundNumber = editingIndex === null ? rounds.length + 1 : editingIndex + 1;
  const ourSide = ourSideAtRound(openingSide, roundNumber);
  const opponent = enemySide(ourSide);
  const winner = draft.weWon ? ourSide : opponent;
  const availableReasons: readonly RoundEndReason[] =
    winner === 'T'
      ? ['elimination', 'bomb-exploded']
      : ['elimination', 'bomb-defused', 'time-expired'];
  const askingPlant = opponent === 'T' && draft.weWon;
  const knownWeapons = countObservedWeapons(draft.weapons);
  const estimates = estimateEnemyRounds(
    rounds.map((round, index) => ({
      ...round,
      ourSide: ourSideAtRound(openingSide, index + 1),
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
      newObservation(ourSideAtRound(openingSide, rounds.length + (editingIndex === null ? 2 : 1))),
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
    setDraft(newObservation(ourSideAtRound(openingSide, rounds.length)));
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
        <div className="min-w-0 rounded-card border border-line bg-surface-1 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-11 tracking-[0.12em] text-ink-dim uppercase">
                <Text path="library.tools.economy.inputEyebrow" />
              </p>
              <h4 className="mt-2 text-20 font-medium">
                <Text path="library.tools.economy.round" values={{ round: roundNumber }} />
              </h4>
            </div>
            <span className="text-12 text-ink-dim">
              <Text path="library.tools.economy.opponent" values={{ side: opponent }} />
            </span>
          </div>

          <fieldset className="mb-5 border-0 p-0">
            <legend className="mb-2 text-12 font-medium">
              <Text path="library.tools.economy.result" />
            </legend>
            <div className="flex flex-wrap gap-2">
              {([true, false] as const).map((weWon) => (
                <button
                  key={String(weWon)}
                  type="button"
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      weWon,
                      reason: 'elimination',
                      enemySurvivors: weWon ? 0 : null,
                    }))
                  }
                  aria-pressed={draft.weWon === weWon}
                  className={choiceClass(draft.weWon === weWon)}
                >
                  <Text path={weWon ? 'library.tools.economy.won' : 'library.tools.economy.lost'} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-5 border-0 p-0">
            <legend className="mb-2 text-12 font-medium">
              <Text path="library.tools.economy.reason" />
            </legend>
            <div className="flex flex-wrap gap-2">
              {availableReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() =>
                    setDraft((previous) => ({
                      ...previous,
                      reason,
                      enemySurvivors: reason === 'elimination' && previous.weWon ? 0 : null,
                    }))
                  }
                  aria-pressed={draft.reason === reason}
                  className={choiceClass(draft.reason === reason)}
                >
                  <Text path={REASON_PATHS[reason]} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-5 border-0 p-0">
            <legend className="mb-2 text-12 font-medium">
              <Text path="library.tools.economy.survivors" />
            </legend>
            <div className="flex flex-wrap gap-2">
              {([null, ...COUNTS] as const).map((count) => (
                <button
                  key={String(count)}
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, enemySurvivors: count }))}
                  aria-pressed={draft.enemySurvivors === count}
                  className={choiceClass(draft.enemySurvivors === count)}
                >
                  {count === null ? <Text path="library.tools.economy.unknown" /> : count}
                </button>
              ))}
            </div>
          </fieldset>

          {askingPlant && (
            <fieldset className="mb-5 border-0 p-0">
              <legend className="mb-2 text-12 font-medium">
                <Text path="library.tools.economy.bombPlanted" />
              </legend>
              <div className="flex flex-wrap gap-2">
                {([null, true, false] as const).map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setDraft((previous) => ({ ...previous, bombPlanted: value }))}
                    aria-pressed={draft.bombPlanted === value}
                    className={choiceClass(draft.bombPlanted === value)}
                  >
                    <Text
                      path={
                        value === null
                          ? 'library.tools.economy.unknown'
                          : value
                            ? 'library.tools.economy.yes'
                            : 'library.tools.economy.no'
                      }
                    />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="[border-block-start:1px_solid_var(--color-line)] pt-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h5 className="text-14 font-medium">
                  <Text path="library.tools.economy.weaponsTitle" />
                </h5>
                <p className="mt-1 text-12 text-ink-dim">
                  <Text path="library.tools.economy.weaponsHint" />
                </p>
              </div>
              <span className="numeric text-12 text-ink-dim">
                <Text path="library.tools.economy.known" values={{ count: knownWeapons }} />
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {OBSERVED_WEAPONS.map((weapon) => {
                const display = WEAPON_LABELS[weapon];
                const label = 'name' in display ? display.name : t(display.path);
                return (
                  <div
                    key={weapon}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-chip border border-line bg-surface-2 px-3 py-2"
                  >
                    <span className="min-w-0 text-12">{label}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={draft.weapons[weapon] === 0}
                        onClick={() =>
                          setDraft((previous) => ({
                            ...previous,
                            weapons: changeObservedWeaponCount(previous.weapons, weapon, -1),
                          }))
                        }
                        aria-label={t('library.tools.economy.decreaseWeapon', {
                          weapon: label,
                        })}
                        className="flex size-11 items-center justify-center rounded-chip bg-surface-3 text-ink disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="numeric w-5 text-center text-13">
                        {draft.weapons[weapon]}
                      </span>
                      <button
                        type="button"
                        disabled={knownWeapons >= 5}
                        onClick={() =>
                          setDraft((previous) => ({
                            ...previous,
                            weapons: changeObservedWeaponCount(previous.weapons, weapon, 1),
                          }))
                        }
                        aria-label={t('library.tools.economy.increaseWeapon', {
                          weapon: label,
                        })}
                        className="flex size-11 items-center justify-center rounded-chip bg-surface-3 text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <fieldset className="mt-5 border-0 p-0">
            <legend className="mb-2 text-12 font-medium">
              <Text path="library.tools.economy.enemyKills" />
            </legend>
            <div className="flex flex-wrap gap-2">
              {([null, ...COUNTS] as const).map((count) => (
                <button
                  key={String(count)}
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, enemyKills: count }))}
                  aria-pressed={draft.enemyKills === count}
                  className={choiceClass(draft.enemyKills === count)}
                >
                  {count === null ? <Text path="library.tools.economy.unknown" /> : count}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveRound}
              className="min-h-10 rounded-card bg-ink px-5 py-2 text-13 font-medium text-surface-0 hover:opacity-90"
            >
              <Text
                path={
                  editingIndex === null
                    ? 'library.tools.economy.addRound'
                    : 'library.tools.economy.saveRound'
                }
              />
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setDraft(newObservation(ourSideAtRound(openingSide, rounds.length + 1)));
                }}
                className="text-12 text-ink-dim hover:text-ink"
              >
                <Text path="library.tools.economy.cancelEdit" />
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card border border-line bg-surface-1 p-5 sm:p-6">
            <p className="text-11 tracking-[0.12em] text-ink-dim uppercase">
              <Text path="library.tools.economy.outputEyebrow" />
            </p>
            {latest === undefined ? (
              <div className="py-8">
                <h4 className="text-20 font-medium">
                  <Text path="library.tools.economy.emptyTitle" />
                </h4>
                <p className="mt-2 text-13 text-ink-dim leading-prose">
                  <Text path="library.tools.economy.emptyHint" />
                </p>
              </div>
            ) : (
              <div aria-live="polite">
                <h4 className="mt-3 text-20 font-medium">
                  <Text
                    path="library.tools.economy.nextRound"
                    values={{ round: latest.round + 1 }}
                  />
                </h4>
                <p className="mt-5 text-12 text-ink-dim">
                  <Text path="library.tools.economy.estimatedBank" />
                </p>
                <div className="numeric mt-1 text-[clamp(27px,3vw,40px)] font-medium tracking-[-0.055em]">
                  ≈{approximateMoney}
                </div>
                <p className="mt-1 text-12 text-ink-dim">
                  <Text path="library.tools.economy.perPlayer" />
                </p>
                <p className="mt-2 text-12 text-ink-dim">
                  <Text path="library.tools.economy.exactUnknown" />
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 [border-block-start:1px_solid_var(--color-line)] pt-4">
                  <div>
                    <p className="text-11 text-ink-dim">
                      <Text path="library.tools.economy.roundIncome" />
                    </p>
                    <p className="numeric mt-1 text-16">
                      {money.format(latest.roundRewardPerPlayer)}
                    </p>
                  </div>
                  <div>
                    <p className="text-11 text-ink-dim">
                      <Text path="library.tools.economy.observedSpend" />
                    </p>
                    <p className="numeric mt-1 text-16">
                      ≈{money.format(Math.round(latest.estimatedNewWeaponSpend / 100) * 100)}
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-12 text-ink-dim leading-prose">
                  <Text path="library.tools.economy.modelNote" />
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-11 text-ink-dim leading-prose">
                  {latest.assumptions.map((assumption) => (
                    <li key={assumption}>
                      <Text path={ASSUMPTION_PATHS[assumption]} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {rounds.length > 0 && (
            <section className="mt-5" aria-label={t('library.tools.economy.history')}>
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="text-13 font-medium">
                  <Text path="library.tools.economy.history" />
                </h4>
                <span className="numeric text-11 text-ink-dim">
                  <Text path="library.tools.economy.roundCount" values={{ count: rounds.length }} />
                </span>
              </div>
              <ol className="list-none [border-block-start:1px_solid_var(--color-line)] p-0">
                {rounds.map((round, index) => (
                  <li
                    key={round.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3"
                  >
                    <span className="numeric w-6 text-12 text-ink-dim">{index + 1}</span>
                    <span className="min-w-0 flex-1 text-12">
                      <Text
                        path={
                          round.weWon
                            ? 'library.tools.economy.historyWon'
                            : 'library.tools.economy.historyLost'
                        }
                      />{' '}
                      <span className="text-ink-dim">
                        · {countObservedWeapons(round.weapons)}/5
                      </span>
                    </span>
                    <span className="numeric text-12 text-ink-dim">
                      ≈
                      {formatRange(
                        estimates[index]?.estimatedNextCashFloorPerPlayer ?? 0,
                        estimates[index]?.estimatedNextCashPerPlayer ?? 0,
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => editRound(index)}
                      className="text-11 text-ink-dim hover:text-ink"
                    >
                      <Text path="library.tools.economy.edit" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRound(index)}
                      className="text-11 text-ink-dim hover:text-ink"
                    >
                      <Text path="library.tools.economy.remove" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
