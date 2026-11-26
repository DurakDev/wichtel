PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  admin_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  wishes_allowed INTEGER NOT NULL DEFAULT 1 CHECK (wishes_allowed IN (0, 1)),
  created_at INTEGER NOT NULL,
  started_at INTEGER
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wish TEXT NOT NULL DEFAULT '',
  personal_token TEXT UNIQUE NOT NULL,
  revealed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS exclusions (
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  excluded_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  PRIMARY KEY(participant_id,excluded_id)
);
CREATE TABLE IF NOT EXISTS assignments (
  giver_id TEXT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  receiver_id TEXT UNIQUE NOT NULL REFERENCES participants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_exclusions_participant ON exclusions(participant_id);
