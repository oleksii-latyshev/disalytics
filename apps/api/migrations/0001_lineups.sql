CREATE TABLE lineups (
  id TEXT PRIMARY KEY,
  map TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX lineups_map ON lineups (map);

-- One counter per map: a write bumps only the map it touched, so an edit to one map does not
-- invalidate every other map's ETag and cached copy.
CREATE TABLE lineup_revisions (
  map TEXT PRIMARY KEY,
  revision INTEGER NOT NULL
);

-- Append-only log of every write, for the admin Worker's history.
CREATE TABLE lineup_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lineup_id TEXT NOT NULL,
  map TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  at INTEGER NOT NULL,
  body TEXT
);

CREATE INDEX lineup_changes_lineup ON lineup_changes (lineup_id, at);
