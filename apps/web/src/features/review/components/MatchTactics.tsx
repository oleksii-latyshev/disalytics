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
  type RoundSideFilter,
  type RoundSort,
  roundEntries,
  roundTacticId,
  visibleEntries,
} from '../helpers/round-tactics';
import { useRoundTacticSave } from '../hooks/use-round-tactic-save';
import { RoundWindowStrip } from './RoundWindowStrip';
import { TacticRoundPicker } from './TacticRoundPicker';
import { TacticSave } from './TacticSave';

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
  const [side, setSide] = useState<RoundSideFilter>('all');
  const [sort, setSort] = useState<RoundSort>('round');
  const [chosen, setChosen] = useState<number>(initialRound);
  const [edited, setEdited] = useState<Edited | null>(null);

  const entries = useMemo(() => roundEntries(demo, team), [demo, team]);
  const visible = useMemo(() => visibleEntries(entries, side, sort), [entries, side, sort]);
  const active = visible.find((entry) => entry.roundIndex === chosen) ?? visible[0];
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
      <div className="surface-card grid min-h-0 grid-rows-[minmax(0,1fr)] rounded-float">
        <TacticRoundPicker
          team={team}
          onTeam={setTeam}
          side={side}
          onSide={setSide}
          sort={sort}
          onSort={setSort}
          entries={visible}
          roundIndex={undefined}
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
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 lg:px-4">
            <h2 className="m-0 min-w-0 truncate font-semibold text-16">{tactic.title}</h2>
            <TacticSave
              id={id}
              savedTitle={save.saved?.title}
              isSaving={save.isSaving}
              hasFailed={save.hasFailed}
              onSave={() => save.save(tactic)}
              onUndo={save.undo}
            />
          </div>
        }
        sidebar={
          <TacticRoundPicker
            team={team}
            onTeam={setTeam}
            side={side}
            onSide={setSide}
            sort={sort}
            onSort={setSort}
            entries={visible}
            roundIndex={roundIndex}
            onRound={setChosen}
          />
        }
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
