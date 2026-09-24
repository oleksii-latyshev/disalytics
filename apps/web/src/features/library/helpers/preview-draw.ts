// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: this allocation-free canvas pass
// keeps its grenade and player dispatch beside the mutable drawing scratch state.
import {
  asPlayerSlot,
  asTick,
  createVisualScratch,
  FLAG_SCOPED,
  FLAG_WALKING,
  type Grenade,
  grenadeRadiusUnits,
  grenadeVisual,
  sampleAt,
  weaponClass,
  weaponIcon,
} from '@disa/demo-core';
import { getMapOverview, radarX, radarY } from '@disa/map-data';
import {
  bodyParts,
  countdownLabels,
  drawDecoyPulse,
  drawFireBody,
  drawFlashMark,
  drawHeRing,
  drawNeedle,
  drawRemainingSeconds,
  drawSmokeBody,
  drawToken,
  drawWalkHollow,
  grenadeColor,
  labelPass,
  type RadarColors,
  readLabelStyle,
  resolveCountdownFont,
  screenAngleOf,
} from '@/features/radar';
import type { Reel, ReelDetail } from './reel';

/** Prepare buffers, labels and utility geometry once; draws only rewrite the scratch arrays. */
export function previewDraw(
  context: CanvasRenderingContext2D,
  reel: Reel,
  detail: ReelDetail,
  colors: RadarColors,
  secondsUnit: string,
) {
  const overview = getMapOverview(reel.map);
  const parts = bodyParts(detail.allGrenadeTypes);
  const visual = createVisualScratch();
  const countdowns = countdownLabels(secondsUnit);
  const font = resolveCountdownFont();
  const yaw = Int16Array.from(detail.yaw);
  const flags = Uint8Array.from(detail.flags);
  const weapon = Uint8Array.from(detail.weapon);
  const kinds = detail.weapons.map(weaponClass);
  const icons = detail.weapons.map(weaponIcon);
  const grenades: Grenade[] = detail.grenades.map((grenade) => ({
    type: grenade.type,
    thrower: asPlayerSlot(0),
    throwTick: asTick(grenade.start),
    detonationTick: asTick(grenade.start),
    expiryTick: grenade.end === null ? null : asTick(grenade.end),
    detonationPosition: { x: grenade.x, y: grenade.y, z: 0 },
    trajectory: {
      firstTick: asTick(0),
      sampleHz: 1,
      sampleCount: 0,
      x: new Float32Array(0),
      y: new Float32Array(0),
      z: new Float32Array(0),
    },
  }));
  const x = new Float32Array(reel.slotCount);
  const y = new Float32Array(reel.slotCount);
  const alive = new Uint8Array(reel.slotCount);
  const held = new Uint8Array(reel.slotCount);
  const deaths = new Float32Array(reel.slotCount).fill(Infinity);
  for (const kill of detail.kills) deaths[kill.victim] = kill.seconds;
  const bounds = { left: 0, top: 0, width: 1, height: 1 };
  const names = labelPass(
    reel.players.map((player) => player.name),
    reel.slotCount,
    readLabelStyle(),
    colors.label,
  );
  const subject = {
    isNamed: (slot: number) => alive[slot] === 1,
    x: (slot: number) => sampleAt(x, slot),
    y: (slot: number) => sampleAt(y, slot),
    alpha: () => 1,
    weapon: (slot: number) => kinds[sampleAt(held, slot)] ?? null,
    icon: (slot: number) => icons[sampleAt(held, slot)],
    detail: () => null,
    damage: () => 0,
    damageLife: () => 0,
  };
  names.measure(context);
  return {
    measure: () => names.measure(context),
    draw(seconds: number, size: number) {
      if (overview === undefined) return;
      context.clearRect(0, 0, size, size);
      const position = Math.min(seconds * reel.hz, reel.frameCount - 1);
      const frame = Math.floor(position);
      const next = Math.min(frame + 1, reel.frameCount - 1);
      const blend = position - frame;
      const scale = size / 1024;
      bounds.width = size;
      bounds.height = size;
      for (let index = 0; index < grenades.length; index++) {
        const grenade = grenades[index];
        const source = detail.grenades[index];
        if (grenade === undefined || source === undefined) continue;
        grenadeVisual(grenade, asTick(seconds), 1, visual);
        if (visual.phase === null || visual.phase === 'flight') continue;
        const gx = radarX(overview, source.x) * scale;
        const gy = radarY(overview, source.y) * scale;
        const radius = (grenadeRadiusUnits(grenade.type) / overview.scale) * scale;
        const body = radius * visual.extent;
        const color = grenadeColor(grenade.type, colors);
        switch (grenade.type) {
          case 'smokegrenade':
            drawSmokeBody(context, gx, gy, body, visual.alpha, color, parts, source.originalIndex);
            drawRemainingSeconds(
              context,
              gx,
              gy,
              body,
              visual.remainingSeconds,
              countdowns,
              colors.countdown,
              colors.label.halo,
              font,
            );
            break;
          case 'molotov':
          case 'incgrenade':
            drawFireBody(context, gx, gy, body, visual.alpha, color, parts, source.originalIndex);
            drawRemainingSeconds(
              context,
              gx,
              gy,
              body,
              visual.remainingSeconds,
              countdowns,
              colors.countdown,
              colors.label.halo,
              font,
            );
            break;
          case 'hegrenade':
            drawHeRing(context, gx, gy, visual.progress, radius, visual.phase === 'linger', color);
            break;
          case 'flashbang':
            drawFlashMark(context, gx, gy, visual.progress, radius, color);
            break;
          case 'decoy':
            drawDecoyPulse(context, gx, gy, visual.pulsePhase, color);
            break;
        }
      }
      for (let slot = 0; slot < reel.slotCount; slot++) {
        const base = slot * reel.frameCount;
        const at = base + frame;
        const bit = slot * reel.frameCount + frame;
        const living =
          (sampleAt(reel.alive, bit >> 3) & (1 << (bit & 7))) !== 0 &&
          seconds < sampleAt(deaths, slot);
        const px =
          (sampleAt(reel.x, at) + (sampleAt(reel.x, base + next) - sampleAt(reel.x, at)) * blend) *
          size;
        const py =
          (sampleAt(reel.y, at) + (sampleAt(reel.y, base + next) - sampleAt(reel.y, at)) * blend) *
          size;
        x[slot] = px;
        y[slot] = py;
        alive[slot] = living ? 1 : 0;
        held[slot] = sampleAt(weapon, at);
        const player = reel.players[slot];
        if (player === undefined) continue;
        if (!living) {
          context.globalAlpha = 0.5;
          drawToken(context, px, py, 4, colors.dead);
          context.globalAlpha = 1;
          continue;
        }
        const color = colors.team[player.side];
        const facing = sampleAt(yaw, at);
        const delta = ((sampleAt(yaw, base + next) - facing + 54000) % 36000) - 18000;
        drawNeedle(
          context,
          px,
          py,
          8,
          screenAngleOf(facing + delta * blend),
          (sampleAt(flags, at) & FLAG_SCOPED) !== 0,
          color,
        );
        drawToken(context, px, py, 8, color);
        if ((sampleAt(flags, at) & FLAG_WALKING) !== 0)
          drawWalkHollow(context, px, py, 8, colors.hollow);
      }
      names.draw(context, bounds, subject, 8);
      context.globalAlpha = 1;
    },
  };
}
