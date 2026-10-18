import type { Translate } from '@disa/i18n';
import { describe, expect, it } from 'vitest';
import { buildPdfContent } from '../content';
import { keyTranslate, sampleTactic, schedulesFor } from './pdf-fixture';

// `keyTranslate` answers with the key it was asked for, which is all these tests need to read.
const t = keyTranslate as Translate;

function contentOf(lineups: readonly { id: string; title: string }[] = []) {
  const { tactic, rootId, branchId } = sampleTactic();
  return {
    rootId,
    branchId,
    tactic,
    content: buildPdfContent({ tactic, t, lineups, schedules: schedulesFor(tactic) }),
  };
}

describe('buildPdfContent sections', () => {
  it('has the main plan first and then only the steps after each fork', () => {
    const { content, rootId, branchId } = contentOf();
    expect(
      content.sections.map((section) => [section.planId === rootId, section.stepIndex]),
    ).toEqual([
      [true, 0],
      [true, 1],
      [false, 1],
    ]);
    expect(content.sections[2]?.planId).toBe(branchId);
  });

  it('heads the first page of a branch with its condition and the players out', () => {
    const { content } = contentOf();
    const branch = content.sections[2];
    expect(branch?.banner?.title).toBe('If player 2 dies');
    expect(branch?.banner?.out).toBe('library.tactics.pdf.branchOut(count=1,slots=2)');
    expect(content.sections[0]?.banner).toBeNull();
    expect(content.sections[1]?.banner).toBeNull();
  });

  it('puts the branch name on the eyebrow of its pages and not on the main plan', () => {
    const { content } = contentOf();
    expect(content.sections[0]?.eyebrow).toBe(
      'library.tactics.board.step.eyebrow(index=1,total=2)',
    );
    expect(content.sections[2]?.eyebrow).toContain('If player 2 dies · ');
  });

  it('falls back to the screen wording for a step left unnamed', () => {
    const { content } = contentOf();
    expect(content.sections[0]?.title).toBe('Take mid');
    expect(content.sections[1]?.title).toBe('library.tactics.board.strip.unnamed(index=2)');
  });

  it('keeps every picture key unique', () => {
    const { content } = contentOf();
    const keys = content.sections.map((section) => section.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('buildPdfContent step text', () => {
  it('carries the idea and leaves a missing one out', () => {
    const { content } = contentOf();
    expect(content.sections[0]?.idea).toBe('Control mid, then split.');
    expect(content.sections[1]?.idea).toBeNull();
  });

  it('lists a task, a wait, and a lacking task as the empty state', () => {
    const { content } = contentOf();
    const [first, second, third] = content.sections[0]?.players ?? [];
    expect(first?.task).toBe('Smoke window, hold top mid');
    expect(second?.delay).toBe('library.tactics.pdf.leaves(seconds=2)');
    expect(third?.task).toBeNull();
    expect(content.sections[0]?.players).toHaveLength(5);
  });

  it('leaves the tasks out of a step in which nobody has one', () => {
    const { content } = contentOf();
    expect(content.sections[1]?.players).toEqual([]);
  });

  it('marks a player out in the branch step they leave and says nothing of the task', () => {
    const { content } = contentOf();
    const out = content.sections[2]?.players.find((player) => player.slot === 1);
    expect(out?.isOut).toBe(true);
    expect(out?.task).toBeNull();
  });

  it('describes a throw with its thrower, its notes and a region to crop', () => {
    const { content } = contentOf();
    const [thrown] = content.sections[0]?.throws ?? [];
    expect(thrown?.kindName).toBe('Smoke Grenade');
    expect(thrown?.notes).toBe('Window smoke');
    expect(thrown?.droppedBy).toBeNull();
    expect(thrown?.meta).toContain('library.tactics.board.throws.byHand');
    expect(thrown?.region?.size).toBeGreaterThanOrEqual(240);
    expect(content.sections[0]?.throwsTitle).toBe('library.tactics.board.throws.title(count=1)');
  });

  it('names a lineup by its title when the catalog has it', () => {
    const { tactic } = sampleTactic();
    const plan = tactic.plans[0];
    const thrown = plan?.steps[0]?.throws[0];
    if (plan === undefined || thrown === undefined) throw new Error('fixture has no throw');
    const withLineup = {
      ...tactic,
      plans: tactic.plans.map((entry) =>
        entry.id === plan.id
          ? {
              ...entry,
              steps: entry.steps.map((step, index) =>
                index === 0
                  ? {
                      ...step,
                      throws: [{ ...thrown, lineupId: 'lineup-1', droppedBy: 3, notes: '  ' }],
                    }
                  : step,
              ),
            }
          : entry,
      ),
    };
    const content = buildPdfContent({
      tactic: withLineup,
      t,
      lineups: [{ id: 'lineup-1', title: 'Window from T spawn' }],
      schedules: schedulesFor(withLineup),
    });
    const entry = content.sections[0]?.throws[0];
    expect(entry?.meta).toContain('how=Window from T spawn');
    expect(entry?.droppedBy).toBe('library.tactics.pdf.droppedBy(slot=4)');
    expect(entry?.notes).toBeNull();
  });

  it('describes the enemies expected, with role and fate, and skips the bare ones', () => {
    const { content } = contentOf();
    const enemies = content.sections[1]?.enemies ?? [];
    expect(enemies).toHaveLength(1);
    const [enemy] = enemies;
    expect(enemy?.role).toBe('library.tactics.board.enemy.roles.awp');
    expect(enemy?.deadNote).toBe('library.tactics.pdf.enemyDead');
    expect(content.sections[0]?.enemies).toEqual([]);
  });
});

describe('buildPdfContent cover', () => {
  it('names the tactic, its map and side, author and description', () => {
    const { content } = contentOf();
    expect(content.title).toBe('Mid split');
    expect(content.cover.subtitle).toContain('subtitleAny(map=de_mirage,side=T');
    expect(content.cover.facts[0]).toEqual({ label: 'library.tactics.pdf.author', value: 'Coach' });
    expect(content.cover.description?.text).toBe('A default.\nSecond line.');
  });

  it('shows the weapon each player buys and what the grenades cost the team', () => {
    const { content } = contentOf();
    const first = content.cover.loadout.find((row) => row.slot === 0);
    expect(first?.weapon).toBe('AK-47');
    expect(first?.grenades).toBe('Smoke Grenade ×1');
    expect(first?.cost).not.toBeNull();
    expect(content.cover.teamCost).not.toBeNull();
  });

  it('lists each plan with the steps it plays, a branch from the fork on', () => {
    const { content } = contentOf();
    const [root, branch] = content.cover.plans;
    expect(root?.isRoot).toBe(true);
    expect(root?.steps.map((step) => step.number)).toEqual([1, 2]);
    expect(branch?.title).toBe('If player 2 dies');
    expect(branch?.meta).toBe('library.tactics.board.strip.laneFromOut(index=1,slots=2)');
    expect(branch?.steps.map((step) => step.number)).toEqual([2]);
  });

  it('uses the untitled wording and drops empty fields', () => {
    const { tactic } = sampleTactic();
    const bare = { ...tactic, title: '  ', author: undefined, description: '', weapons: undefined };
    const content = buildPdfContent({
      tactic: bare,
      t,
      lineups: [],
      schedules: schedulesFor(bare),
    });
    expect(content.title).toBe('library.tactics.untitled');
    expect(content.cover.facts.map((fact) => fact.label)).toEqual(['library.tactics.pdf.plans']);
    expect(content.cover.description).toBeNull();
  });

  it('still reads when the map is unknown and nothing was scheduled', () => {
    const { tactic } = sampleTactic();
    const content = buildPdfContent({ tactic, t, lineups: [], schedules: new Map() });
    expect(content.sections[0]?.startsAt).toBeNull();
    expect(content.sections[0]?.throws[0]?.region).toBeNull();
    expect(content.cover.plans[0]?.steps[0]?.clock).toBeNull();
  });
});
