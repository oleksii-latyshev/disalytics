/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { D1Binding } from '../db/client';

interface SqliteStatement {
  columns(): unknown[];
  all(...values: unknown[]): unknown[];
  run(...values: unknown[]): unknown;
  /** Rows as arrays, so two columns of one name (a join's `id`s) both survive. */
  setReturnArrays(enabled: boolean): void;
}

interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
}

type SqliteModule = { DatabaseSync: new (path: string) => SqliteDatabase };

function loadSqlite(): SqliteModule | null {
  try {
    const loaded: SqliteModule = createRequire(import.meta.url)('node:sqlite');
    return loaded;
  } catch {
    return null;
  }
}

const sqlite = loadSqlite();

/**
 * `node:sqlite` needs Node 22.13+; where it is missing the D1 tests skip locally, but CI pins a
 * Node that has it, so there a missing module is a failure rather than a silent skip.
 */
export const hasSqlite = sqlite !== null;
if (!hasSqlite && process.env.CI !== undefined) {
  throw new Error('node:sqlite is unavailable in CI; the D1 tests would skip');
}

const MIGRATIONS = new URL('../../migrations/', import.meta.url);

class Statement {
  constructor(
    private readonly db: SqliteDatabase,
    readonly sql: string,
    private readonly values: readonly unknown[] = [],
  ) {}

  bind(...values: unknown[]): Statement {
    return new Statement(this.db, this.sql, values);
  }

  private rows(arrays = false): unknown[] {
    const statement = this.db.prepare(this.sql);
    if (statement.columns().length === 0) {
      statement.run(...this.values);
      return [];
    }
    statement.setReturnArrays(arrays);
    return statement.all(...this.values);
  }

  async run() {
    this.rows();
    return { results: [], success: true };
  }

  async all() {
    return { results: this.rows(), success: true };
  }

  async raw() {
    return this.rows(true);
  }
}

/** A real SQLite database with the repository's migration applied, behind the D1 calls Drizzle makes. */
export function sqliteD1(): D1Binding {
  if (sqlite === null) throw new Error('node:sqlite is unavailable');
  const db = new sqlite.DatabaseSync(':memory:');
  for (const name of readdirSync(MIGRATIONS)
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    db.exec(readFileSync(new URL(name, MIGRATIONS), 'utf8'));
  }
  return {
    prepare: (sql: string) => new Statement(db, sql),
    async batch(statements: Statement[]) {
      db.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
