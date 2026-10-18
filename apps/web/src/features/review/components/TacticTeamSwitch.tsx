import type { OpeningSide } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { TeamTag } from './TeamTag';

const TEAMS: readonly OpeningSide[] = ['ct', 't'];

interface Props {
  team: OpeningSide;
  onTeam: (team: OpeningSide) => void;
}

/** Which team's rounds are read, named by the side it opened on. */
export function TacticTeamSwitch({ team, onTeam }: Props) {
  const t = useT();

  return (
    <fieldset
      aria-label={t('review.tactics.team.label')}
      className="m-0 flex min-w-0 gap-0.5 rounded-card border-none bg-surface-1 p-0.5"
    >
      {TEAMS.map((each) => (
        <button
          key={each}
          type="button"
          aria-pressed={each === team}
          onClick={() => onTeam(each)}
          className="h-8 rounded-chip px-2.5 text-12 text-ink-dim transition-colors hover:bg-hover aria-pressed:bg-surface-3 aria-pressed:text-ink"
        >
          <TeamTag team={each} />
        </button>
      ))}
    </fieldset>
  );
}
