import { matchScoreboard, type ParsedDemo, type PlayerSlot } from '@disa/demo-core';
import { useMemo, useState } from 'react';
import { ScoreboardTeam } from './ScoreboardTeam';

/**
 * The match's full scoreboard — `ROADMAP.md` M5's row, and the reading that was too big for a team
 * card's seat on the stage.
 *
 * **Both teams at once**, named by the side they opened on, which is the only name the demo gives a
 * team. `matchScoreboard` in `demo-core` is the rule; this screen chooses the layout and nothing
 * else.
 *
 * **At most one row stands open across both tables.** Two open rounds-by-round strips is two
 * readings of the same shape in one view, and the question the panel answers — "which rounds was
 * this player in" — is asked of one player at a time.
 */
export function MatchScoreboard({ demo }: { demo: ParsedDemo }) {
  const [opened, setOpened] = useState<PlayerSlot | null>(null);

  // Derived once per match: this walks every round, kill and hit, and nothing on this screen is on
  // a readout, so it must not be re-derived by a press on a row.
  const teams = useMemo(() => matchScoreboard(demo), [demo]);

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[72rem] content-start gap-3 overflow-y-auto wide:grid-cols-2">
      {teams.map((team) => (
        <ScoreboardTeam
          key={team.team}
          demo={demo}
          team={team}
          opened={opened}
          onOpen={setOpened}
        />
      ))}
    </div>
  );
}
