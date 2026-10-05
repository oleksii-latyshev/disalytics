import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import type { TargetSource } from '../helpers/lineup-targets';

const CHIP = 'rounded-chip border border-line px-2 py-0.5 text-12 text-ink';

interface Props {
  lineup: Lineup;
  source: TargetSource;
}

/** Whose it is and what it is for: side, where it came from, who made it, how it is tagged. */
export function LineupChips({ lineup, source }: Props) {
  const { author } = lineup;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={CHIP}>
        {lineup.side === 'BOTH' ? (
          <Text path="library.lineups.chip.bothSides" />
        ) : (
          <Text path="library.lineups.chip.side" values={{ side: lineup.side }} />
        )}
      </span>
      <span className={CHIP}>
        <Text path={`library.lineups.source.${source}`} />
      </span>
      {author !== undefined && (
        <span className={CHIP}>
          {author.url === undefined ? (
            <Text path="library.lineups.chip.author" values={{ name: author.name }} />
          ) : (
            <Text
              path="library.lineups.chip.author"
              values={{
                name: (
                  <a
                    href={author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-ink-dim"
                  >
                    {author.name}
                  </a>
                ),
              }}
            />
          )}
        </span>
      )}
      {lineup.tags?.map((tag) => (
        <span key={tag} className={CHIP}>
          <Text path={`library.lineups.tags.${tag}`} />
        </span>
      ))}
    </div>
  );
}
