import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { Failure } from '../api/client';

/** An error as a designed state: what went wrong, the server's detail when it gave one, a way on. */
export function Notice({
  failure,
  onRetry,
}: {
  failure: Failure;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-card border border-damage/50 bg-surface-2 p-3"
    >
      <p className="font-medium text-13 text-ink">
        <Text path="admin.error.title" />
      </p>
      <p className="text-13 text-ink-dim">
        <Text path={failure.key} />
      </p>
      {failure.detail === undefined ? null : (
        <p className="numeric break-words text-12 text-ink-faint">{failure.detail}</p>
      )}
      {onRetry === undefined ? null : (
        <Button variant="outline" onClick={onRetry}>
          <Text path="admin.error.retry" />
        </Button>
      )}
    </div>
  );
}
