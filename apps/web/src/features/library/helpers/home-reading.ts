/** Where the last opened match was left: its cache key, the round (1-based), and when. */
export interface Reading {
  readonly key: string;
  readonly round: number;
  readonly at: number;
}

export function parseReading(raw: string): Reading | null {
  if (raw === '') return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof decoded !== 'object' || decoded === null) return null;

  const { key, round, at } = decoded as Record<string, unknown>;
  if (typeof key !== 'string' || key === '') return null;
  if (typeof round !== 'number' || !Number.isInteger(round) || round < 1) return null;
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;

  return { key, round, at };
}

export function formatReading(reading: Reading): string {
  return JSON.stringify(reading);
}
