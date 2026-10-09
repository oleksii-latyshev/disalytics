import type { PreviewResponse, Problem } from '@disa/admin-contract';
import { type Lineup, looseLineup } from '@disa/demo-core';
import { useMemo, useReducer, useState } from 'react';
import { call } from '../api/client';
import { type LoadedFile, mapsOf, readLineupFile } from '../helpers/lineup-file';
import { photoSrc } from '../helpers/photo-src';
import {
  type ItemState,
  initialItem,
  needsDecision,
  type Outcome,
  outcomeOf,
  type Plan,
  planOf,
  problemsOfPlan,
} from '../helpers/review';
import { EMPTY_REVIEW, reviewReducer } from '../helpers/review-state';
import { usePhotoSizes } from './use-photo-sizes';
import { useResource } from './use-resource';

export interface Row {
  readonly item: ItemState;
  readonly plan: Plan;
  readonly problems: readonly Problem[];
  readonly outcome: Outcome;
}

let fileCounter = 0;

function typed(entry: unknown): Lineup | null {
  return looseLineup(entry);
}

function itemsOf(data: PreviewResponse): ItemState[] {
  const states: ItemState[] = [];
  for (const item of data.items) {
    const lineup = typed(item.lineup);
    if (lineup === null) continue;
    const stored = item.stored === undefined ? null : typed(item.stored);
    states.push(
      initialItem({
        item,
        lineup,
        stored,
        secondId: `${lineup.id}-${crypto.randomUUID().slice(0, 8)}`,
      }),
    );
  }
  return states;
}

/** The opened file, its preview against the site, and everything the person has decided so far. */
export function useReview(map: string, setMap: (map: string) => void, onOpened: () => void) {
  const [loaded, setLoaded] = useState<{ id: number; file: LoadedFile } | null>(null);
  const [problem, setProblem] = useState<ReturnType<typeof readLineupFile> | null>(null);
  const [state, dispatch] = useReducer(reviewReducer, EMPTY_REVIEW);

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

  const data = preview.status === 'ready' ? preview.data : null;
  const [seen, setSeen] = useState<PreviewResponse | null>(null);
  if (data !== seen) {
    setSeen(data);
    if (data !== null)
      dispatch({ type: 'loaded', photoBase: data.photoBase, items: itemsOf(data) });
  }

  const images = loaded?.file.images ?? NO_IMAGES;
  const items = state.order.flatMap((id) => state.items[id] ?? []);
  const comparable = items.filter((item) => item.stored !== null);
  const refs = [
    ...new Set(
      comparable.flatMap((item) => [
        ...(item.stored?.imageUrls ?? []),
        ...(item.edited.imageUrls ?? []),
      ]),
    ),
  ];
  const sizes = usePhotoSizes(refs, (ref) => photoSrc(ref, images));

  const rows = items.map((item): Row => {
    const plan = planOf(item, state.photoBase, sizes);
    const problems = problemsOfPlan(plan, map);
    return { item, plan, problems, outcome: outcomeOf(item, plan, problems) };
  });

  const serverOnly = useMemo(
    () => (data?.serverOnly ?? []).flatMap((entry) => typed(entry) ?? []),
    [data],
  );

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
    images,
    sizes,
    state,
    dispatch,
    rows,
    questions: rows.filter((row) => needsDecision(row.item)),
    serverOnly,
    open,
    clear: () => {
      setLoaded(null);
      setProblem(null);
    },
  };
}

const NO_IMAGES: Readonly<Record<string, string>> = {};

export type Review = ReturnType<typeof useReview>;
