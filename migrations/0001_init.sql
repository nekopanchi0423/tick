CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT '3s',
  guest_token TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON game_sessions(guest_token, started_at);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_token TEXT NOT NULL,
  mode TEXT NOT NULL,
  target_ms INTEGER NOT NULL,
  actual_ms INTEGER NOT NULL,
  error_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_scores_mode_error ON scores(mode, error_ms);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at);

CREATE TABLE IF NOT EXISTS best_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_token TEXT NOT NULL,
  mode TEXT NOT NULL,
  best_error_ms INTEGER NOT NULL,
  score_id INTEGER NOT NULL REFERENCES scores(id),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(guest_token, mode)
);

CREATE INDEX IF NOT EXISTS idx_best_mode_error ON best_scores(mode, best_error_ms);
CREATE INDEX IF NOT EXISTS idx_best_mode_updated ON best_scores(mode, updated_at);
