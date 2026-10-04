import { type PlayerMatchLine, playerMatchLine } from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { useEffect, useState } from 'react';
import { readSavedDemo } from '@/core/parsing';

export interface PlayerMatch {
  readonly demo: SavedDemo;
  readonly line: PlayerMatchLine;
}

export type PlayerMatches =
  | { status: 'idle' }
  | { status: 'reading'; done: number; total: number }
  | { status: 'done'; matches: readonly PlayerMatch[]; total: number };

/**
 * One match's line for one player, kept for the session. `null` is an answer too — the player was
 * not in that match — so a second search for the same id reads nothing. A key names bytes that
 * cannot change under it (§6.4), which is what makes this safe to keep.
 */
const LINES = new Map<string, PlayerMatchLine | null>();

const yieldToPaint = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function lineOf(demo: SavedDemo, steamId: string): Promise<PlayerMatchLine | null> {
  const cacheKey = `${demo.key}|${steamId}`;
  const known = LINES.get(cacheKey);
  if (known !== undefined) return known;

  const parsed = await readSavedDemo(demo.key);
  // A vanished entry is a miss and is not remembered: it may be back once it is opened again.
  if (parsed === null) return null;

  const line = playerMatchLine(parsed, steamId);
  LINES.set(cacheKey, line);
  return line;
}

/**
 * Finds one player in every saved match, one container at a time. Reading a container is a cache
 * read that never writes recency, and decoding is the whole cost, so the matches are taken in turn
 * with a yield between them rather than all at once: the screen shows how far it has got and the
 * tab never holds more than one decoded match.
 */
export function usePlayerMatches(
  demos: readonly SavedDemo[] | null,
  steamId: string | null,
): PlayerMatches {
  const [state, setState] = useState<PlayerMatches>({ status: 'idle' });

  useEffect(() => {
    if (demos === null || steamId === null) {
      setState({ status: 'idle' });
      return;
    }

    let isCurrent = true;

    const run = async () => {
      const found: PlayerMatch[] = [];
      setState({ status: 'reading', done: 0, total: demos.length });

      for (const [index, demo] of demos.entries()) {
        const line = await lineOf(demo, steamId).catch(() => null);
        if (!isCurrent) return;

        if (line !== null) found.push({ demo, line });
        setState({ status: 'reading', done: index + 1, total: demos.length });
        await yieldToPaint();
        if (!isCurrent) return;
      }

      setState({ status: 'done', matches: found, total: demos.length });
    };

    void run();

    return () => {
      isCurrent = false;
    };
  }, [demos, steamId]);

  return state;
}
