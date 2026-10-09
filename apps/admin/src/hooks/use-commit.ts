import type { CommitResponse } from '@disa/admin-contract';
import { useCallback, useRef, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import type { Chunk } from '../helpers/chunks';

export type CommitState =
  | { readonly phase: 'idle' }
  | { readonly phase: 'running'; readonly done: number; readonly total: number }
  | {
      readonly phase: 'failed';
      readonly done: number;
      readonly total: number;
      readonly results: readonly CommitResponse[];
      readonly failure: Failure;
    }
  | { readonly phase: 'done'; readonly results: readonly CommitResponse[] };

function asFailure(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

/** Sends commits one after another and can pick up again at the commit that failed. */
export function useCommit(onSettled: () => void) {
  const [state, setState] = useState<CommitState>({ phase: 'idle' });
  const job = useRef<{
    map: string;
    chunks: readonly Chunk[];
    copy: boolean;
    results: CommitResponse[];
  } | null>(null);

  const run = useCallback(async () => {
    const current = job.current;
    if (current === null) return;
    const total = current.chunks.length;
    for (let index = current.results.length; index < total; index += 1) {
      const chunk = current.chunks[index];
      if (chunk === undefined) break;
      setState({ phase: 'running', done: index, total });
      try {
        const result = await call((client) =>
          client.commit.run({
            payload: {
              map: current.map,
              file: {
                version: 2,
                generator: 'disalytics',
                exportedAt: new Date().toISOString(),
                lineups: chunk.lineups,
                images: chunk.images,
              },
              resolutions: chunk.resolutions,
              copyLinkPhotos: current.copy,
            },
          }),
        );
        current.results.push(result);
      } catch (error) {
        setState({
          phase: 'failed',
          done: index,
          total,
          results: [...current.results],
          failure: asFailure(error),
        });
        onSettled();
        return;
      }
    }
    setState({ phase: 'done', results: [...current.results] });
    onSettled();
  }, [onSettled]);

  const start = useCallback(
    (map: string, chunks: readonly Chunk[], copy: boolean) => {
      job.current = { map, chunks, copy, results: [] };
      void run();
    },
    [run],
  );

  const reset = useCallback(() => {
    job.current = null;
    setState({ phase: 'idle' });
  }, []);

  return { state, start, retry: run, reset };
}
