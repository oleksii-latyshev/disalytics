import type { Lineup } from '@disa/demo-core';

export const BASE = 'https://api.example/photos';

export function lineup(overrides: Partial<Lineup> = {}): Lineup {
  return {
    id: 'mirage-1',
    title: 'Smoke window',
    map: 'de_mirage',
    side: 'T',
    kind: 'smoke',
    origin: { x: 100, y: 200, z: 0 },
    landing: { x: 300, y: 400, z: 0 },
    pitch: -10,
    yaw: 45,
    throwType: 'stand',
    movementKeys: [],
    movementKeysSummary: '',
    command: '',
    createdAt: 1,
    ...overrides,
  };
}

export const sha = (n: number) => n.toString(16).padStart(64, '0');
