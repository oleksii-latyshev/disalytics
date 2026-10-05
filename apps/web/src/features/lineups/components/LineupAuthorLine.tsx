import type { LineupAuthor } from '@disa/demo-core';
import { Text } from '@disa/i18n';

export function LineupAuthorLine({ author }: { readonly author: LineupAuthor | undefined }) {
  if (author === undefined) return null;
  return (
    <p className="flex min-w-0 flex-wrap items-baseline gap-1.5 text-12 text-ink-dim">
      <span className="label-dense">
        <Text path="library.lineups.author" />
      </span>
      {author.url ? (
        <a
          href={author.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-words text-ink underline underline-offset-2 hover:text-ink-dim"
        >
          {author.name}
        </a>
      ) : (
        <span className="min-w-0 break-words text-ink">{author.name}</span>
      )}
    </p>
  );
}
