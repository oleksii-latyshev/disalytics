import {
  ANGLE_SCALE,
  FLAG_DUCKING,
  FLAG_WALKING,
  type GrenadeType,
  type ParsedDemo,
  type PlayerSlot,
  type Team,
  type WorldPoint,
} from '../schema';
import type { UtilityThrow } from './utility-throws';

export type ThrowType = 'stand' | 'run' | 'jump' | 'crouch' | 'unknown';

export type MovementKey = 'W' | 'A' | 'S' | 'D' | 'Shift' | 'Ctrl' | 'Jump' | 'Stand';

export interface ThrowDetail {
  readonly roundIndex: number;
  readonly thrower: PlayerSlot;
  readonly throwerSide: Team | undefined;
  readonly grenadeType: GrenadeType;
  readonly throwType: ThrowType;
  readonly movementKeys: readonly MovementKey[];
  readonly movementKeysSummary: string;
  readonly playerPos: WorldPoint;
  readonly landing: WorldPoint;
  readonly pitch: number;
  readonly yaw: number;
  readonly command: string;
}

/**
 * Derives the lineup details, aim orientation, movement keys in the 2-second run-up window,
 * and CS2 console commands (`setpos ...; setang ...`) to repeat the throw.
 */
interface RunUpState {
  readonly maxSpeed: number;
  readonly anyWalking: boolean;
  readonly anyDucking: boolean;
}

function scanRunUp(
  track: ParsedDemo['track'],
  slot: number,
  frame: number,
  cell: number,
): RunUpState {
  const windowFrames = Math.round(2.0 * track.sampleHz);
  const startFrame = Math.max(0, frame - windowFrames);

  let maxSpeed = 0;
  let anyWalking = false;
  let anyDucking = ((track.flags[cell] ?? 0) & FLAG_DUCKING) !== 0;

  for (let f = startFrame; f <= frame; f++) {
    const c = f * track.slotCount + slot;
    const spd = track.speed[c] ?? 0;
    const flg = track.flags[c] ?? 0;
    if (spd > maxSpeed) maxSpeed = spd;
    if ((flg & FLAG_WALKING) !== 0) anyWalking = true;
    if ((flg & FLAG_DUCKING) !== 0) anyDucking = true;
  }

  return { maxSpeed, anyWalking, anyDucking };
}

interface JumpState {
  readonly isJumping: boolean;
  readonly minZ: number;
}

function detectJump(
  track: ParsedDemo['track'],
  slot: number,
  frame: number,
  posZ: number,
): JumpState {
  const jumpCheckStart = Math.max(0, frame - 6);
  let minZ = posZ;
  for (let f = jumpCheckStart; f <= frame; f++) {
    const c = f * track.slotCount + slot;
    const z = track.posZ[c] ?? posZ;
    if (z < minZ) minZ = z;
  }

  return { isJumping: posZ - minZ > 8.0, minZ };
}

interface Displacement {
  readonly forward: number;
  readonly right: number;
  readonly disp: number;
}

function computeDisplacement(
  track: ParsedDemo['track'],
  slot: number,
  frame: number,
  posX: number,
  posY: number,
  yaw: number,
): Displacement {
  const yawRad = (yaw * Math.PI) / 180;
  const yawCos = Math.cos(yawRad);
  const yawSin = Math.sin(yawRad);

  const moveWindowStart = Math.max(0, frame - track.sampleHz);
  const moveStartCell = moveWindowStart * track.slotCount + slot;
  const dx = posX - (track.posX[moveStartCell] ?? posX);
  const dy = posY - (track.posY[moveStartCell] ?? posY);

  return {
    forward: dx * yawCos + dy * yawSin,
    right: dx * yawSin - dy * yawCos,
    disp: Math.hypot(dx, dy),
  };
}

function deriveMovementKeys(
  isMoving: boolean,
  isJumping: boolean,
  anyWalking: boolean,
  anyDucking: boolean,
  forward: number,
  right: number,
): MovementKey[] {
  const keys: MovementKey[] = [];
  if (anyDucking) keys.push('Ctrl');
  if (anyWalking) keys.push('Shift');

  if (!isMoving) {
    keys.push('Stand');
  } else {
    if (forward > 15) keys.push('W');
    else if (forward < -15) keys.push('S');

    if (right > 15) keys.push('D');
    else if (right < -15) keys.push('A');
  }

  if (isJumping) keys.push('Jump');
  return keys;
}

function classifyThrowType(isJumping: boolean, anyDucking: boolean, isMoving: boolean): ThrowType {
  if (isJumping) return 'jump';
  if (anyDucking) return 'crouch';
  if (isMoving) return 'run';
  return 'stand';
}

/**
 * Derives exact player position, view angles, and movement context for replicating a grenade throw.
 *
 * - Pitch and yaw are read from `TickTrack` at the throw frame.
 * - If the player jumped, the pre-jump ground elevation is used for `setpos` so the player
 *   teleports to the stand spot on the ground rather than floating in mid-air.
 * - Movement keys (W, A, S, D, Shift, Ctrl, Jump) describe the player's run-up actions.
 */
export function throwDetail(demo: ParsedDemo, thrown: UtilityThrow): ThrowDetail {
  const { track } = demo;
  const { frame, grenade, landing, roundIndex, throwerSide } = thrown;
  const slot = grenade.thrower;
  const cell = frame * track.slotCount + slot;

  const posX = track.posX[cell] ?? 0;
  const posY = track.posY[cell] ?? 0;
  const posZ = track.posZ[cell] ?? 0;
  const pitch = (track.pitch[cell] ?? 0) / ANGLE_SCALE;
  const yaw = (track.yaw[cell] ?? 0) / ANGLE_SCALE;

  const { maxSpeed, anyWalking, anyDucking } = scanRunUp(track, slot, frame, cell);
  const { isJumping, minZ } = detectJump(track, slot, frame, posZ);
  const { forward, right, disp } = computeDisplacement(track, slot, frame, posX, posY, yaw);

  const throwSpeed = track.speed[cell] ?? 0;
  const isMoving = throwSpeed > 20 || (maxSpeed > 50 && disp > 15);

  const keys = deriveMovementKeys(isMoving, isJumping, anyWalking, anyDucking, forward, right);
  const movementKeysSummary = keys.join(' + ') || 'Stand';
  const throwType = classifyThrowType(isJumping, anyDucking, isMoving);

  const standZ = isJumping ? minZ : posZ;
  const playerPos: WorldPoint = { x: posX, y: posY, z: standZ };

  const command = `setpos ${posX.toFixed(2)} ${posY.toFixed(2)} ${standZ.toFixed(2)}; setang ${pitch.toFixed(2)} ${yaw.toFixed(2)} 0 // ${movementKeysSummary}`;

  return {
    roundIndex,
    thrower: slot,
    throwerSide,
    grenadeType: grenade.type,
    throwType,
    movementKeys: keys,
    movementKeysSummary,
    playerPos,
    landing,
    pitch,
    yaw,
    command,
  };
}
