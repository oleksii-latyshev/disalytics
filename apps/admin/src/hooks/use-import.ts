import type { PreviewResponse } from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { useMemo, useState } from 'react';
import { call } from '../api/client';
import { type Decision, type Decisions, initialDecisions } from '../helpers/decisions';
import { type LoadedFile, mapsOf, readLineupFile } from '../helpers/lineup-file';
import { useResource } from './use-resource';

export interface FileState {
  readonly id: number;
  readonly file: LoadedFile;
}

let fileCounter = 0;

/** The opened file, its preview against the stored lineups, and what is decided for each row. */
export function useImport(map: string, setMap: (map: string) => void, onOpened: () => void) {
  const [loaded, setLoaded] = useState<FileState | null>(null);
  const [problem, setProblem] = useState<ReturnType<typeof readLineupFile> | null>(null);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [copyLinks, setCopyLinks] = useState(false);

  const [preview, reloadPreview] = useResource<PreviewResponse>(
    loaded === null ? null : `${loaded.id}:${map}`,
    () => {
      if (loaded === null) throw new Error('no file');
      return call((client) =>
        client.preview.run({
          payload: {
            map,
            file: { version: 2, generator: 'disalytics', lineups: loaded.file.lineups },
          },
        }),
      );
    },
  );

  const lineups = useMemo(
    () =>
      new Map<string, Lineup>((loaded?.file.lineups ?? []).map((lineup) => [lineup.id, lineup])),
    [loaded],
  );

  // The decisions start from what the preview offers and are rebuilt whenever it changes.
  const [seen, setSeen] = useState<PreviewResponse | null>(null);
  const data = preview.status === 'ready' ? preview.data : null;
  if (data !== seen) {
    setSeen(data);
    setDecisions(data === null ? {} : initialDecisions(data.items, lineups));
  }

  const open = (name: string, text: string) => {
    onOpened();
    const result = readLineupFile(name, text);
    setProblem(result.ok ? null : result);
    if (!result.ok) return;
    fileCounter += 1;
    setLoaded({ id: fileCounter, file: result.file });
    const maps = mapsOf(result.file.lineups);
    if (maps.length === 1 && maps[0] !== undefined) setMap(maps[0]);
  };

  return {
    loaded,
    problem,
    preview,
    data,
    reloadPreview,
    lineups,
    decisions,
    setDecision: (id: string, next: Decision) =>
      setDecisions((previous) => ({ ...previous, [id]: next })),
    copyLinks,
    setCopyLinks,
    open,
    clear: () => {
      setLoaded(null);
      setProblem(null);
    },
  };
}
