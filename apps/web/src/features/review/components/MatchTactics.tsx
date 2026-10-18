import {
  defaultRoundWindow,
  moveWindowEdge,
  type OpeningSide,
  type ParsedDemo,
  type RoundWindow,
  roundPlant,
  tacticOfRound,
  type WindowEdge,
} from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { TacticPreview } from '@disa/tactic-board';
import { useMemo, useState } from 'react';
import { namedRoundTactic } from '../helpers/round-tactic-names';
import {
  ALL_ROUNDS,
  type RoundFilter,
  roundEntries,
  roundTacticId,
} from '../helpers/round-tactics';
import { useRoundTacticSave } from '../hooks/use-round-tactic-save';
import { RoundWindowStrip } from './RoundWindowStrip';
import { TacticRoundDetail } from './TacticRoundDetail';
import { TacticRoundStrip } from './TacticRoundStrip';
import { TacticSave } from './TacticSave';
import { TacticTeamSwitch } from './TacticTeamSwitch';

interface Props {
  demo: ParsedDemo;
  demoKey: string;
  /** The round the reader came from, to open on when this team played it. */
  initialRound: number;
}

interface Edited {
  roundIndex: number;
  team: OpeningSide;
  window: RoundWindow;
}

/**
 * Each round of a team as a tactic — the tactic editor's screen with the roster swapped for the
 * rounds. Everything on it is derived from the match once per team, round and window: nothing here
 * is a function of the clock, and the stage's frame channel is not involved.
 */
export function MatchTactics({ demo, demoKey, initialRound }: Props) {
  const t = useT();
  const locale = useLocale();
  const [team, setTeam] = useState<OpeningSide>('t');
  const [filter, setFilter] = useState<RoundFilter>(ALL_ROUNDS);
  const [chosen, setChosen] = useState<number>(initialRound);
  const [edited, setEdited] = useState<Edited | null>(null);

  const entries = useMemo(() => roundEntries(demo, team), [demo, team]);
  const active = entries.find((entry) => entry.roundIndex === chosen) ?? entries[0];
  const roundIndex = active?.roundIndex;

  const window = useMemo((): RoundWindow | undefined => {
    if (roundIndex === undefined) return undefined;
    if (edited?.roundIndex === roundIndex && edited.team === team) return edited.window;
    return defaultRoundWindow(demo, roundIndex);
  }, [demo, edited, roundIndex, team]);

  const id = useMemo(
    () =>
      roundIndex === undefined || window === undefined
        ? ''
        : roundTacticId(demoKey, roundIndex, team, window),
    [demoKey, roundIndex, team, window],
  );
  const result = useMemo(
    () =>
      roundIndex === undefined || window === undefined
        ? undefined
        : tacticOfRound(demo, roundIndex, team, { id, window }),
    [demo, roundIndex, team, window, id],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: `t` is new every render and the names change only with the locale
  const tactic = useMemo(
    () =>
      result === undefined || active === undefined
        ? undefined
        : namedRoundTactic(result, { map: demo.header.map, round: active.number }, t),
    [result, active, demo.header.map, locale],
  );
  const save = useRoundTacticSave(id);

  if (
    roundIndex === undefined ||
    window === undefined ||
    result === undefined ||
    tactic === undefined
  ) {
    return (
      <div className="surface-card flex min-h-0 flex-col gap-2 rounded-float p-3">
        <TacticTeamSwitch team={team} onTeam={setTeam} />
        <TacticRoundStrip
          entries={entries}
          roundIndex={undefined}
          filter={filter}
          onFilter={setFilter}
          onRound={setChosen}
        />
      </div>
    );
  }

  const handleMove = (edge: WindowEdge, tick: number) => {
    const moved = moveWindowEdge(demo, roundIndex, window, edge, tick);
    if (moved !== undefined) setEdited({ roundIndex, team, window: moved });
  };

  return (
    <div className="surface-card min-h-0 overflow-hidden rounded-float">
      <TacticPreview
        tactic={tactic}
        header={
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 lg:px-4">
              <h2 className="m-0 min-w-0 truncate font-semibold text-16">{tactic.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <TacticTeamSwitch team={team} onTeam={setTeam} />
                <TacticSave
                  id={id}
                  savedTitle={save.saved?.title}
                  isSaving={save.isSaving}
                  hasFailed={save.hasFailed}
                  onSave={() => save.save(tactic)}
                  onUndo={save.undo}
                />
              </div>
            </div>
            <TacticRoundStrip
              entries={entries}
              roundIndex={roundIndex}
              filter={filter}
              onFilter={setFilter}
              onRound={setChosen}
            />
          </div>
        }
        detail={active === undefined ? null : <TacticRoundDetail entry={active} />}
        footer={
          <RoundWindowStrip
            demo={demo}
            roundIndex={roundIndex}
            window={window}
            cutSeconds={result.stepStartSeconds.slice(1)}
            plantTick={roundPlant(demo, roundIndex)?.tick ?? null}
            onMove={handleMove}
          />
        }
      />
    </div>
  );
}
