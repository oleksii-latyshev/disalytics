import type { CommitResponse } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { CommitState } from '../hooks/use-commit';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

export function CommitBar({
  count,
  state,
  onApply,
  onRetry,
}: {
  count: number;
  state: CommitState;
  onApply: () => void;
  onRetry: () => void;
}) {
  const busy = state.phase === 'running';
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={count === 0 || busy} onClick={onApply}>
          <Text path="admin.commit.apply" values={{ count }} />
        </Button>
        {count === 0 && !busy ? (
          <span className="text-12 text-ink-dim">
            <Text path="admin.commit.nothing" />
          </span>
        ) : null}
        {state.phase === 'running' ? (
          <span className="numeric text-13 text-ink-dim">
            <Text
              path="admin.commit.progress"
              values={{ done: state.done + 1, total: state.total }}
            />
          </span>
        ) : null}
      </div>
      {state.phase === 'failed' ? (
        <>
          <Results results={state.results} />
          <Notice failure={state.failure} onRetry={onRetry} />
        </>
      ) : null}
    </div>
  );
}

function Results({ results }: { results: readonly CommitResponse[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {results.map((result, index) => (
        // The parts come back in the order they were sent and never reorder.
        // biome-ignore lint/suspicious/noArrayIndexKey: stable, append-only list
        <li key={index} className="numeric text-12 text-ink-dim">
          <Text path="admin.result.saved" values={{ count: result.saved }} />
        </li>
      ))}
    </ol>
  );
}

export function ResultSummary({
  results,
  skipped,
  onAgain,
}: {
  results: readonly CommitResponse[];
  skipped: number;
  onAgain: () => void;
}) {
  const saved = results.reduce((sum, result) => sum + result.saved, 0);
  const uploaded = results.reduce((sum, result) => sum + result.photos.uploaded, 0);
  const copied = results.reduce((sum, result) => sum + result.photos.copied, 0);
  const failed = results.flatMap((result) => result.photos.failed);
  const revision = results.at(-1)?.revision ?? 0;

  return (
    <Section title={<Text path="admin.result.title" />}>
      <ul className="numeric flex flex-col gap-1 text-13 text-ink">
        <li>
          <Text path="admin.result.saved" values={{ count: saved }} />
        </li>
        <li>
          <Text path="admin.result.skipped" values={{ count: skipped }} />
        </li>
        <li>
          <Text path="admin.result.uploaded" values={{ count: uploaded }} />
        </li>
        <li>
          <Text path="admin.result.copied" values={{ count: copied }} />
        </li>
      </ul>
      <Muted>
        <Text path="admin.result.revision" values={{ revision }} />
      </Muted>
      {failed.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-13 text-ink">
            <Text path="admin.result.failedTitle" />
          </h3>
          <ul className="flex flex-col gap-1">
            {failed.map((entry) => (
              <li key={entry.url} className="numeric break-all text-12 text-ink-dim">
                {entry.url} — <FailureReason reason={entry.reason} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <Button variant="outline" onClick={onAgain}>
          <Text path="admin.result.again" />
        </Button>
      </div>
    </Section>
  );
}

const REASONS = {
  not_https: 'admin.linkFailure.notHttps',
  invalid_url: 'admin.linkFailure.invalidUrl',
  bad_redirect: 'admin.linkFailure.badRedirect',
  too_many_redirects: 'admin.linkFailure.tooManyRedirects',
  timeout: 'admin.linkFailure.timeout',
  network: 'admin.linkFailure.network',
  too_large: 'admin.linkFailure.tooLarge',
  not_an_image: 'admin.linkFailure.notAnImage',
} as const;

function FailureReason({ reason }: { reason: string }) {
  const known = Object.entries(REASONS).find(([code]) => code === reason);
  if (known !== undefined) return <Text path={known[1]} />;
  const status = /^http_(\d{3})$/.exec(reason)?.[1];
  if (status !== undefined) return <Text path="admin.linkFailure.httpStatus" values={{ status }} />;
  return <Text path="admin.linkFailure.other" />;
}
