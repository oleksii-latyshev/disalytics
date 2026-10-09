import { Text, useT } from '@disa/i18n';
import { Button, DURATION_PANEL_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { failureReason } from '../../helpers/failure-reason';
import type { ApplyState, Attention } from '../../hooks/use-apply';
import { Notice } from '../Notice';
import { Card } from './Parts';

function Progress({ done, total }: { done: number; total: number }) {
  const ratio = total === 0 ? 1 : Math.min(1, (done + 0.5) / total);
  return (
    <div className="mt-4">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-surface-3"
      >
        <motion.div
          className="h-full origin-left rounded-full bg-ink"
          initial={false}
          animate={{ scaleX: ratio }}
          transition={{ duration: DURATION_PANEL_SECONDS, ease: EASE_OUT }}
        />
      </div>
      <p className="numeric mt-2 text-13 text-ink-dim">
        <Text path="admin.apply.progress" values={{ done: Math.min(done + 1, total), total }} />
      </p>
    </div>
  );
}

function Check() {
  return (
    <motion.svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      aria-hidden="true"
      className="text-[var(--status-new)]"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: DURATION_PANEL_SECONDS, ease: EASE_OUT }}
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.4"
      />
      <motion.path
        d="M13 23l6 6 12-13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: DURATION_PANEL_SECONDS, delay: 0.15, ease: EASE_OUT }}
      />
    </motion.svg>
  );
}

function AttentionList({
  items,
  onRetry,
  onWithout,
}: {
  items: readonly Attention[];
  onRetry: (ids: readonly string[]) => void;
  onWithout: (ids: readonly string[]) => void;
}) {
  const t = useT();
  const all = items.map((item) => item.id);
  return (
    <>
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.apply.attentionTitle" />
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-14 text-ink-dim">
        <Text path="admin.apply.attentionLede" values={{ count: items.length }} />
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-chip border border-line bg-surface-2 p-3"
          >
            <b className="font-medium text-14 text-ink">{item.title}</b>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-13 text-ink-dim">
              {item.failures.map((failure) => {
                const reason = failureReason(failure.reason);
                return (
                  <li key={failure.ref} className="[overflow-wrap:anywhere]">
                    <span className="numeric text-ink">
                      {failure.ref.startsWith('local:') ? t('admin.apply.embedded') : failure.ref}
                    </span>
                    {' — '}
                    <Text path={reason.key} values={{ status: reason.status ?? 0 }} />
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" onClick={() => onRetry([item.id])}>
                <Text path="admin.apply.retry" />
              </Button>
              <Button variant="outline" onClick={() => onWithout([item.id])}>
                <Text path="admin.apply.without" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button onClick={() => onRetry(all)}>
            <Text path="admin.apply.retryAll" />
          </Button>
          <Button variant="outline" onClick={() => onWithout(all)}>
            <Text path="admin.apply.withoutAll" />
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** Saving, then what came of it: progress, a photo that needs a decision, or the finished result. */
export function StepDone({
  state,
  onRetry,
  onRetryPhotos,
  onWithoutPhotos,
  onAgain,
  onBackToCheck,
}: {
  state: ApplyState;
  onRetry: () => void;
  onRetryPhotos: (ids: readonly string[]) => void;
  onWithoutPhotos: (ids: readonly string[]) => void;
  onAgain: () => void;
  onBackToCheck: () => void;
}) {
  return (
    <Card>
      {state.phase === 'running' ? (
        <>
          <h2 className="font-semibold text-20 text-ink">
            <Text path="admin.apply.runningTitle" />
          </h2>
          <Progress done={state.done} total={state.total} />
        </>
      ) : null}
      {state.phase === 'failed' ? (
        <>
          <h2 className="font-semibold text-20 text-ink">
            <Text path="admin.apply.stoppedTitle" />
          </h2>
          <p className="mt-1.5 mb-3 text-14 text-ink-dim">
            <Text
              path="admin.apply.stoppedLede"
              values={{ done: state.done, total: state.total }}
            />
          </p>
          <Notice failure={state.failure} onRetry={onRetry} />
          <Button variant="outline" className="mt-3" onClick={onBackToCheck}>
            <Text path="admin.apply.backToCheck" />
          </Button>
        </>
      ) : null}
      {state.phase === 'attention' ? (
        <AttentionList items={state.items} onRetry={onRetryPhotos} onWithout={onWithoutPhotos} />
      ) : null}
      {state.phase === 'done' ? (
        <div className="flex flex-col items-start gap-2">
          <Check />
          <h2 className="font-semibold text-20 text-[var(--status-new)]">
            <Text path="admin.apply.doneTitle" />
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-14 text-ink">
            <li>
              <Text path="admin.result.saved" values={{ count: state.summary.saved }} />
            </li>
            {state.summary.removed > 0 ? (
              <li>
                <Text path="admin.result.removed" values={{ count: state.summary.removed }} />
              </li>
            ) : null}
            <li>
              <Text path="admin.result.skipped" values={{ count: state.summary.skipped }} />
            </li>
            {state.summary.uploaded > 0 ? (
              <li>
                <Text path="admin.result.uploaded" values={{ count: state.summary.uploaded }} />
              </li>
            ) : null}
            {state.summary.copied > 0 ? (
              <li>
                <Text path="admin.result.copied" values={{ count: state.summary.copied }} />
              </li>
            ) : null}
            <li className="text-ink-dim">
              <Text path="admin.result.parts" values={{ count: state.summary.parts }} />
            </li>
          </ul>
          {state.summary.revision === null ? null : (
            <p className="mt-1 max-w-[62ch] text-14 text-ink-dim">
              <Text path="admin.result.revision" values={{ revision: state.summary.revision }} />
            </p>
          )}
          <Button className="mt-2" onClick={onAgain}>
            <Text path="admin.result.again" />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
