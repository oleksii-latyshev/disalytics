import type { CommitDecision, CommitResponse, PhotoFailure } from '@disa/admin-contract';
import { looseLineup } from '@disa/demo-core';
import { useCallback, useRef, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { type Part, planParts, type Writing } from '../helpers/parts';
import { withoutRefs } from '../helpers/photos';

export interface Attention {
  readonly id: string;
  readonly title: string;
  readonly failures: readonly PhotoFailure[];
}

export interface Summary {
  readonly saved: number;
  readonly skipped: number;
  readonly uploaded: number;
  readonly copied: number;
  readonly removed: number;
  readonly revision: number | null;
  readonly parts: number;
}

export type ApplyState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'running'; readonly done: number; readonly total: number }
  | {
      readonly phase: 'failed';
      readonly done: number;
      readonly total: number;
      readonly failure: Failure;
    }
  | { readonly phase: 'attention'; readonly items: readonly Attention[] }
  | { readonly phase: 'done'; readonly summary: Summary };

export interface ApplyInput {
  readonly map: string;
  readonly writings: readonly Writing[];
  readonly images: Readonly<Record<string, string>>;
  readonly photoBase: string;
  readonly removals: readonly string[];
  readonly skipped: number;
}

interface Held {
  readonly decision: CommitDecision;
  readonly failures: readonly PhotoFailure[];
}

interface Job {
  readonly input: ApplyInput;
  pending: Part[];
  removals: string[];
  held: Map<string, Held>;
  total: number;
  done: number;
  saved: number;
  uploaded: number;
  copied: number;
  removed: number;
  parts: number;
  revision: number | null;
}

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

function decisionId(decision: CommitDecision): string {
  const lineup = looseLineup(decision.lineup);
  return decision.targetId ?? lineup?.id ?? '';
}

function writingOf(held: Held, strip: boolean): Writing[] {
  const lineup = looseLineup(held.decision.lineup);
  if (lineup === null) return [];
  const refs = new Set(held.failures.map(({ ref }) => ref));
  return [
    {
      action: held.decision.action === 'replace' ? 'replace' : 'add',
      ...(held.decision.targetId === undefined ? {} : { targetId: held.decision.targetId }),
      ...(held.decision.sourceId === undefined ? {} : { sourceId: held.decision.sourceId }),
      lineup: strip ? withoutRefs(lineup, refs) : lineup,
    },
  ];
}

function summaryOf(job: Job): Summary {
  return {
    saved: job.saved,
    skipped: job.input.skipped,
    uploaded: job.uploaded,
    copied: job.copied,
    removed: job.removed,
    revision: job.revision,
    parts: job.parts,
  };
}

function absorb(job: Job, part: Part, result: CommitResponse): void {
  job.saved += result.saved;
  job.uploaded += result.photos.uploaded;
  job.copied += result.photos.copied;
  job.revision = result.revision;
  job.parts += 1;
  for (const withheld of result.withheld) {
    const decision = part.decisions.find((entry) => decisionId(entry) === withheld.id);
    if (decision !== undefined)
      job.held.set(withheld.id, { decision, failures: withheld.failures });
  }
}

/**
 * Sends the decisions part by part and the deletions after them, and can pick up at the step that
 * failed. A lineup whose photo could not be stored comes back as something to look at: try again,
 * or save it without that photo.
 */
export function useApply(onSettled: () => void) {
  const [state, setState] = useState<ApplyState>({ phase: 'idle' });
  const job = useRef<Job | null>(null);

  const run = useCallback(async () => {
    const current = job.current;
    if (current === null) return;
    const progress = () => ({ done: current.done, total: current.total });
    try {
      for (let part = current.pending[0]; part !== undefined; part = current.pending[0]) {
        setState({ phase: 'running', ...progress() });
        const result = await call((client) =>
          client.commit.run({
            payload: { map: current.input.map, decisions: part.decisions, images: part.images },
          }),
        );
        current.pending.shift();
        current.done += 1;
        absorb(current, part, result);
      }
      for (let id = current.removals[0]; id !== undefined; id = current.removals[0]) {
        setState({ phase: 'running', ...progress() });
        await call((client) => client.lineups.remove({ params: { id } }));
        current.removals.shift();
        current.done += 1;
        current.removed += 1;
      }
    } catch (error) {
      setState({ phase: 'failed', ...progress(), failure: failureOf(error) });
      onSettled();
      return;
    }
    onSettled();
    if (current.held.size === 0) {
      setState({ phase: 'done', summary: summaryOf(current) });
      return;
    }
    setState({
      phase: 'attention',
      items: [...current.held].map(([id, held]) => ({
        id,
        title: looseLineup(held.decision.lineup)?.title ?? id,
        failures: held.failures,
      })),
    });
  }, [onSettled]);

  const start = useCallback(
    (input: ApplyInput) => {
      const parts = planParts(input.writings, input.images, input.photoBase);
      job.current = {
        input,
        pending: parts,
        removals: [...input.removals],
        held: new Map(),
        total: parts.length + input.removals.length,
        done: 0,
        saved: 0,
        uploaded: 0,
        copied: 0,
        removed: 0,
        parts: 0,
        revision: null,
      };
      void run();
    },
    [run],
  );

  const requeue = useCallback(
    (ids: readonly string[], strip: boolean) => {
      const current = job.current;
      if (current === null) return;
      const writings = ids.flatMap((id) => {
        const held = current.held.get(id);
        current.held.delete(id);
        return held === undefined ? [] : writingOf(held, strip);
      });
      const parts = planParts(writings, current.input.images, current.input.photoBase);
      current.pending.push(...parts);
      current.total += parts.length;
      void run();
    },
    [run],
  );

  const reset = useCallback(() => {
    job.current = null;
    setState({ phase: 'idle' });
  }, []);

  return {
    state,
    start,
    retry: run,
    retryPhotos: (ids: readonly string[]) => requeue(ids, false),
    continueWithout: (ids: readonly string[]) => requeue(ids, true),
    reset,
  };
}
