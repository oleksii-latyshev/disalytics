import type { Lineup, LineupAuthor } from '@disa/demo-core';
import type { LineupFormValues } from './lineup-form-model';

interface ParsedCoordinates {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly landing: { readonly x: number; readonly y: number; readonly z: number };
  readonly pitch: number;
  readonly yaw: number;
}

function parseCoordinates(values: LineupFormValues): ParsedCoordinates | null {
  const ox = Number.parseFloat(values.originX);
  const oy = Number.parseFloat(values.originY);
  const oz = Number.parseFloat(values.originZ);
  const lx = Number.parseFloat(values.landingX);
  const ly = Number.parseFloat(values.landingY);
  const lz = Number.parseFloat(values.landingZ);
  const p = Number.parseFloat(values.pitch);
  const y = Number.parseFloat(values.yaw);

  if (
    !Number.isFinite(ox) ||
    !Number.isFinite(oy) ||
    !Number.isFinite(lx) ||
    !Number.isFinite(ly)
  ) {
    return null;
  }

  return {
    origin: { x: ox, y: oy, z: oz },
    landing: { x: lx, y: ly, z: lz },
    pitch: p,
    yaw: y,
  };
}

function resolveBuildCommands(
  values: LineupFormValues,
  coords: ParsedCoordinates,
  generateCommand: boolean,
): { readonly command: string; readonly landingCommand?: string } {
  if (!values.fromDemo) {
    return { command: '' };
  }
  const cmd = values.command.trim();
  const command =
    cmd ||
    (generateCommand
      ? `setpos ${coords.origin.x.toFixed(2)} ${coords.origin.y.toFixed(2)} ${coords.origin.z.toFixed(2)}; setang ${coords.pitch.toFixed(2)} ${coords.yaw.toFixed(2)} 0`
      : '');

  const landCmd = values.landingCommand.trim();
  const landingCommand =
    landCmd ||
    `setpos ${coords.landing.x.toFixed(2)} ${coords.landing.y.toFixed(2)} ${coords.landing.z.toFixed(2)}`;

  return { command, landingCommand };
}

function authorOf(values: LineupFormValues): { readonly author?: LineupAuthor } {
  const name = values.authorName.trim();
  if (!name) return {};
  const url = values.authorUrl.trim();
  return { author: url ? { name, url } : { name } };
}

function optionalLineupFields(
  values: LineupFormValues,
  parsedWaypoints: readonly { readonly x: number; readonly y: number; readonly z: number }[],
  landingCommand?: string,
) {
  return {
    ...(parsedWaypoints.length > 0 ? { waypoints: parsedWaypoints } : {}),
    ...(values.groupId ? { groupId: values.groupId } : {}),
    ...(values.groupTarget ? { groupTarget: values.groupTarget } : {}),
    ...(values.mouseButtons.length > 0 ? { mouseButtons: values.mouseButtons } : {}),
    ...(values.movementInstructions.trim()
      ? { movementInstructions: values.movementInstructions.trim() }
      : {}),
    ...(values.imageUrls.length > 0
      ? { imageUrls: values.imageUrls, imageCaptions: values.imageCaptions }
      : {}),
    ...(landingCommand ? { landingCommand } : {}),
    ...(values.fromDemo ? { fromDemo: true } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    ...(values.mediaUrl.trim() ? { mediaUrl: values.mediaUrl.trim() } : {}),
    ...(values.targetCallout.trim() ? { targetCallout: values.targetCallout.trim() } : {}),
    ...(values.tags.length > 0 ? { tags: values.tags } : {}),
    ...authorOf(values),
  };
}

export function buildLineupFromForm(
  values: LineupFormValues,
  initialId?: string,
  initialCreatedAt?: number,
  generateCommand = true,
): Lineup | null {
  const coords = parseCoordinates(values);
  if (!coords) {
    return null;
  }

  const { command, landingCommand } = resolveBuildCommands(values, coords, generateCommand);
  const movementSummary =
    values.movementKeys.join(' + ') || (values.throwType === 'stand' ? 'Stand' : 'Jump');

  const parsedWaypoints = (values.waypoints ?? [])
    .map((wp) => ({
      x: Number.parseFloat(wp.x),
      y: Number.parseFloat(wp.y),
      z: Number.parseFloat(wp.z) || 0,
    }))
    .filter((wp) => Number.isFinite(wp.x) && Number.isFinite(wp.y));

  return {
    id: initialId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: values.title.trim(),
    map: values.map,
    side: values.side,
    kind: values.kind,
    origin: coords.origin,
    landing: coords.landing,
    ...optionalLineupFields(values, parsedWaypoints, landingCommand),
    pitch: coords.pitch,
    yaw: coords.yaw,
    throwType: values.throwType,
    movementKeys: values.movementKeys,
    movementKeysSummary: movementSummary,
    command,
    isBuiltIn: false,
    createdAt: initialCreatedAt ?? Date.now(),
  };
}
