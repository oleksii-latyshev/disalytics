import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/** The slice of a D1 binding Drizzle needs; the real `D1Database` satisfies it. */
export interface D1Binding {
  prepare(query: string): unknown;
  batch(statements: never[]): Promise<unknown>;
}

export function makeDb(binding: D1Binding) {
  return drizzle(binding, { schema });
}

export type Db = ReturnType<typeof makeDb>;
