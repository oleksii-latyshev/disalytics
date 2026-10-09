import type { PreviewItem, Resolution, ResolutionAction } from '@disa/admin-contract';
import type { Lineup, LineupTag } from '@disa/demo-core';

export interface Decision {
  readonly action: ResolutionAction;
  readonly title: string;
  readonly tags: readonly LineupTag[];
}

export type Decisions = Readonly<Record<string, Decision>>;

/** What the preview offers for each status; the first is the default except for duplicates. */
export const ACTIONS: Readonly<Record<PreviewItem['status'], readonly ResolutionAction[]>> = {
  new: ['add', 'skip'],
  update: ['replace', 'keep-both', 'skip'],
  duplicate: ['skip', 'add', 'replace'],
  unchanged: ['skip'],
};

export function initialDecisions(
  items: readonly PreviewItem[],
  lineups: ReadonlyMap<string, Lineup>,
): Decisions {
  const decisions: Record<string, Decision> = {};
  for (const item of items) {
    const lineup = lineups.get(item.id);
    const action = ACTIONS[item.status][0];
    if (lineup === undefined || action === undefined) continue;
    decisions[item.id] = { action, title: lineup.title, tags: lineup.tags ?? [] };
  }
  return decisions;
}

function sameTags(a: readonly LineupTag[], b: readonly LineupTag[]): boolean {
  return a.length === b.length && a.every((tag) => b.includes(tag));
}

/** The resolutions to send: every row that is not skipped, with only the edits that were made. */
export function toResolutions(
  decisions: Decisions,
  lineups: ReadonlyMap<string, Lineup>,
): Resolution[] {
  const resolutions: Resolution[] = [];
  for (const [id, decision] of Object.entries(decisions)) {
    const lineup = lineups.get(id);
    if (lineup === undefined || decision.action === 'skip') continue;
    const title = decision.title.trim();
    resolutions.push({
      id,
      action: decision.action,
      ...(title !== lineup.title && title.length > 0 ? { title } : {}),
      ...(sameTags(decision.tags, lineup.tags ?? []) ? {} : { tags: decision.tags }),
    });
  }
  return resolutions;
}
