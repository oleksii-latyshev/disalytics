import { describe, expect, it } from 'vitest';
import { isPistolRound, teamBuyClass, teamRoundStats } from '../helpers/team-stats';
import {
  asPlayerSlot,
  asTick,
  type BombPlant,
  type BuyType,
  type ParsedDemo,
  type PlayerEconomy,
  type Round,
  type RoundWinReason,
  type Team,
} from '../schema';
import { newEvents, newTrack, withKill } from './helpers';

const OPENING_CT = [0, 1, 2, 3, 4];
const OPENING_T = [5, 6, 7, 8, 9];

interface Spec {
  /** The side the *opening CT* team (slots 0–4) holds; the other team holds the opposite. */
  winner: Team;
  /** Buy types of the opening CT team and the opening T team. */
  buys?: readonly [BuyType, BuyType];
  reason?: RoundWinReason;
  planted?: boolean;
  /** Victims in order, killed by `attacker` of the opposing roster. */
  deaths?: readonly number[];
  killer?: number;
}

function sideOfOpeningCt(number: number): Team {
  return number <= 12 ? 'CT' : 'T';
}

function economy(number: number, buys: readonly [BuyType, BuyType]): readonly PlayerEconomy[] {
  const ctSide = sideOfOpeningCt(number);
  const entry = (slot: number, team: Team, buyType: BuyType): PlayerEconomy => ({
    slot: asPlayerSlot(slot),
    money: 0,
    equipmentValue: 0,
    buyType,
    team,
  });
  return [
    ...OPENING_CT.map((slot) => entry(slot, ctSide, buys[0])),
    ...OPENING_T.map((slot) => entry(slot, ctSide === 'CT' ? 'T' : 'CT', buys[1])),
  ];
}

function newDemo(specs: readonly Spec[]): ParsedDemo {
  let events = newEvents();
  const plants: BombPlant[] = [];
  const rounds: Round[] = specs.map((spec, index) => {
    const number = index + 1;
    const startTick = index * 1000;
    if (spec.planted) {
      plants.push({
        tick: asTick(startTick + 500),
        planter: asPlayerSlot(5),
        site: 'A',
        detonationTick: null,
      });
    }
    for (const [at, victim] of (spec.deaths ?? []).entries()) {
      const killer = spec.killer ?? (victim < 5 ? 5 : 0);
      events = withKill(events, {
        tick: asTick(startTick + 200 + at * 10),
        attacker: asPlayerSlot(killer),
        victim: asPlayerSlot(victim),
      });
    }
    return {
      number,
      startTick: asTick(startTick),
      freezeTimeEndTick: asTick(startTick + 100),
      endTick: asTick(startTick + 900),
      winner: spec.winner,
      reason: spec.reason ?? (spec.winner === 'CT' ? 'all-t-eliminated' : 'all-ct-eliminated'),
      roundTimeSeconds: null,
      economy: economy(number, spec.buys ?? ['full-buy', 'full-buy']),
    };
  });

  return {
    header: { map: 'de_mirage', tickRate: 64, players: [], weapons: [] },
    track: newTrack(),
    events: { ...events, rounds, plants },
  };
}

/** Rounds `from..to` won by the side given, using `rest` for everything not specified. */
function rounds(count: number, spec: Spec): Spec[] {
  return Array.from({ length: count }, () => spec);
}

const [opening, other] = [0, 1] as const;

describe('isPistolRound', () => {
  it('is round 1 and round 13 only', () => {
    const demo = newDemo(rounds(30, { winner: 'CT' }));
    const pistols = demo.events.rounds.filter(isPistolRound).map((round) => round.number);
    expect(pistols).toEqual([1, 13]);
  });
});

describe('teamBuyClass', () => {
  const round = (types: readonly BuyType[]): Round => ({
    number: 5,
    startTick: asTick(0),
    freezeTimeEndTick: asTick(1),
    endTick: asTick(2),
    winner: 'CT',
    reason: 'all-t-eliminated',
    roundTimeSeconds: null,
    economy: types.map((buyType, slot) => ({
      slot: asPlayerSlot(slot),
      money: 0,
      equipmentValue: 0,
      buyType,
      team: 'CT',
    })),
  });

  it('takes the buy more than half of the players made', () => {
    expect(teamBuyClass(round(['full-buy', 'full-buy', 'full-buy', 'eco', 'eco']), 'CT')).toBe(
      'full',
    );
    expect(teamBuyClass(round(['eco', 'eco', 'eco', 'full-buy', 'force-buy']), 'CT')).toBe('eco');
  });

  it('counts a semi-buy as a force', () => {
    expect(
      teamBuyClass(round(['semi-buy', 'force-buy', 'semi-buy', 'full-buy', 'eco']), 'CT'),
    ).toBe('force');
  });

  it('is mixed when nothing has a majority', () => {
    expect(teamBuyClass(round(['eco', 'eco', 'force-buy', 'force-buy', 'full-buy']), 'CT')).toBe(
      'mixed',
    );
  });

  it('is unknown for a side with no recorded players', () => {
    expect(teamBuyClass(round(['eco']), 'T')).toBeNull();
  });
});

describe('teamRoundStats', () => {
  it('counts pistol rounds on the side each team played them', () => {
    // Opening CT wins round 1 (as CT) and loses round 13 (as T).
    const specs = [
      { winner: 'CT' as const },
      ...rounds(11, { winner: 'T' }),
      { winner: 'CT' as const }, // round 13: opening CT is on T, so CT winner is the other team
    ];
    const stats = teamRoundStats(newDemo(specs));

    expect(stats[opening]?.pistol).toEqual({
      CT: { rounds: 1, hits: 1 },
      T: { rounds: 1, hits: 0 },
    });
    expect(stats[other]?.pistol).toEqual({
      CT: { rounds: 1, hits: 1 },
      T: { rounds: 1, hits: 0 },
    });
  });

  it('has no pistol rounds when the demo starts after them', () => {
    const demo = newDemo(rounds(4, { winner: 'CT' }));
    const late: ParsedDemo = {
      ...demo,
      events: {
        ...demo.events,
        rounds: demo.events.rounds.map((round) => ({ ...round, number: round.number + 4 })),
      },
    };

    expect(teamRoundStats(late)[opening]?.pistol.CT).toEqual({ rounds: 0, hits: 0 });
  });

  it('splits wins by the team buy and leaves pistols and mixed rounds out of the buys', () => {
    const specs: Spec[] = [
      { winner: 'CT', buys: ['pistol', 'pistol'] },
      { winner: 'CT', buys: ['eco', 'full-buy'] },
      { winner: 'T', buys: ['eco', 'full-buy'] },
      { winner: 'CT', buys: ['force-buy', 'semi-buy'] },
    ];
    const stats = teamRoundStats(newDemo(specs));
    const first = stats[opening];

    expect(first?.buy.eco.CT).toEqual({ rounds: 2, hits: 1 });
    expect(first?.buy.force.CT).toEqual({ rounds: 1, hits: 1 });
    expect(first?.buy.full.CT).toEqual({ rounds: 0, hits: 0 });
    expect(stats[other]?.buy.full.T).toEqual({ rounds: 2, hits: 1 });
    expect(stats[other]?.buy.force.T).toEqual({ rounds: 1, hits: 0 });
  });

  it('counts anti-eco rounds lost by the full buy', () => {
    const specs: Spec[] = [
      { winner: 'CT', buys: ['pistol', 'pistol'] },
      { winner: 'CT', buys: ['eco', 'full-buy'] },
      { winner: 'T', buys: ['eco', 'full-buy'] },
      { winner: 'CT', buys: ['full-buy', 'full-buy'] },
    ];
    const stats = teamRoundStats(newDemo(specs));

    // Round 2: the full buy (opening T, on T) lost to the eco; round 3 it won.
    expect(stats[other]?.antiEco.T).toEqual({ rounds: 2, hits: 1 });
    expect(stats[opening]?.antiEco.CT).toEqual({ rounds: 0, hits: 0 });
  });

  it('measures first-kill conversion by who took the opening kill', () => {
    const specs: Spec[] = [
      // Opening CT kills first and wins.
      { winner: 'CT', deaths: [5] },
      // Opening CT kills first and loses.
      { winner: 'T', deaths: [6] },
      // Opening T kills first and wins.
      { winner: 'T', deaths: [0] },
      // No kills: neither team is in a first-kill base.
      { winner: 'CT' },
    ];
    const stats = teamRoundStats(newDemo(specs));

    expect(stats[opening]?.firstKillGot.CT).toEqual({ rounds: 2, hits: 1 });
    expect(stats[opening]?.firstKillConceded.CT).toEqual({ rounds: 1, hits: 0 });
    expect(stats[other]?.firstKillGot.T).toEqual({ rounds: 1, hits: 1 });
    expect(stats[other]?.firstKillConceded.T).toEqual({ rounds: 2, hits: 1 });
  });

  it('measures man advantage after the first death from five on each side', () => {
    const specs: Spec[] = [
      { winner: 'CT', deaths: [5] },
      { winner: 'T', deaths: [5] },
      { winner: 'CT', deaths: [0] },
    ];
    const stats = teamRoundStats(newDemo(specs));

    expect(stats[opening]?.fiveVsFour.CT).toEqual({ rounds: 2, hits: 1 });
    expect(stats[opening]?.fourVsFive.CT).toEqual({ rounds: 1, hits: 1 });
    expect(stats[other]?.fourVsFive.T).toEqual({ rounds: 2, hits: 1 });
    expect(stats[other]?.fiveVsFour.T).toEqual({ rounds: 1, hits: 0 });
  });

  it('counts a suicide as a man down but not as an opening kill', () => {
    const specs: Spec[] = [{ winner: 'CT', deaths: [0], killer: 0 }];
    const stats = teamRoundStats(newDemo(specs));

    expect(stats[opening]?.fourVsFive.CT).toEqual({ rounds: 1, hits: 1 });
    expect(stats[opening]?.firstKillGot.CT.rounds).toBe(0);
    expect(stats[opening]?.firstKillConceded.CT.rounds).toBe(0);
  });

  it('leaves man advantage unknown when a roster is not five strong', () => {
    const demo = newDemo([{ winner: 'CT', deaths: [5] }]);
    const [only] = demo.events.rounds;
    if (only === undefined) throw new Error('no round');
    const short: ParsedDemo = {
      ...demo,
      events: {
        ...demo.events,
        rounds: [{ ...only, economy: only.economy.filter((entry) => entry.slot !== 9) }],
      },
    };

    const stats = teamRoundStats(short);
    expect(stats[opening]?.fiveVsFour.CT.rounds).toBe(0);
    expect(stats[opening]?.fourVsFive.CT.rounds).toBe(0);
  });

  it('counts plants per T round, post-plant wins and retakes', () => {
    const specs: Spec[] = [
      // Opening CT on CT: the other team is T. Planted, T wins the post-plant.
      { winner: 'T', planted: true, reason: 'bomb-exploded' },
      // Planted, CT retakes.
      { winner: 'CT', planted: true, reason: 'bomb-defused' },
      // No plant, CT wins.
      { winner: 'CT' },
    ];
    const stats = teamRoundStats(newDemo(specs));

    expect(stats[other]?.bomb.plants).toEqual({ rounds: 3, hits: 2 });
    expect(stats[other]?.bomb.postPlant).toEqual({ rounds: 2, hits: 1 });
    expect(stats[other]?.bomb.retakes).toEqual({ rounds: 0, hits: 0 });
    expect(stats[opening]?.bomb.retakes).toEqual({ rounds: 2, hits: 1 });
    expect(stats[opening]?.bomb.plants).toEqual({ rounds: 0, hits: 0 });
  });

  it('leaves draws out of every count', () => {
    const stats = teamRoundStats(
      newDemo([
        { winner: 'CT', reason: 'draw' },
        { winner: 'CT', buys: ['pistol', 'pistol'] },
      ]),
    );

    expect(stats[opening]?.rounds.CT).toEqual({ rounds: 1, hits: 1 });
  });

  // The reconciliation the issue asks of both samples, on a synthetic match that crosses halftime.
  it('reconciles every split with the decided rounds', () => {
    const half = (winner: Team, deaths: readonly number[]): Spec[] =>
      rounds(12, { winner, deaths, planted: winner === 'T', buys: ['eco', 'full-buy'] });
    const demo = newDemo([
      ...half('CT', [5]),
      ...half('T', [0, 6]),
      { winner: 'CT', reason: 'draw' },
    ]);
    const decided = demo.events.rounds.filter((round) => round.reason !== 'draw').length;
    const [first, second] = teamRoundStats(demo);
    if (first === undefined || second === undefined) throw new Error('missing team');

    for (const stats of [first, second]) {
      const total = stats.rounds.CT.rounds + stats.rounds.T.rounds;
      expect(total).toBe(decided);

      const classified =
        stats.pistol.CT.rounds +
        stats.pistol.T.rounds +
        stats.mixedBuy.CT.rounds +
        stats.mixedBuy.T.rounds +
        (['eco', 'force', 'full'] as const).reduce(
          (sum, buy) => sum + stats.buy[buy].CT.rounds + stats.buy[buy].T.rounds,
          0,
        );
      expect(classified).toBe(total);

      const firstKills = [stats.firstKillGot, stats.firstKillConceded];
      const withOpener = firstKills.reduce(
        (sum, tally) => sum + tally.CT.rounds + tally.T.rounds,
        0,
      );
      expect(withOpener).toBe(total);
    }

    // The two teams played every decided round against each other: wins add up to the rounds.
    const wins = [first, second].reduce(
      (sum, stats) => sum + stats.rounds.CT.hits + stats.rounds.T.hits,
      0,
    );
    expect(wins).toBe(decided);

    const plantedRounds = first.bomb.retakes.rounds + second.bomb.retakes.rounds;
    const tRounds = first.bomb.plants.rounds + second.bomb.plants.rounds;
    expect(tRounds).toBe(decided);
    expect(plantedRounds).toBe(second.bomb.postPlant.rounds + first.bomb.postPlant.rounds);
  });
});
