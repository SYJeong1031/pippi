CREATE TABLE IF NOT EXISTS pippi_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pager_number TEXT NOT NULL UNIQUE CHECK(length(pager_number) = 7),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS pippi_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES pippi_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS pippi_sessions_user_id_idx ON pippi_sessions(user_id);
CREATE INDEX IF NOT EXISTS pippi_sessions_expires_at_idx ON pippi_sessions(expires_at);

CREATE TABLE IF NOT EXISTS pippi_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_user_id INTEGER NOT NULL REFERENCES pippi_users(id) ON DELETE CASCADE,
  recipient_user_id INTEGER NOT NULL REFERENCES pippi_users(id) ON DELETE CASCADE,
  numeric_message TEXT NOT NULL CHECK(length(numeric_message) BETWEEN 1 AND 15),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  read_at INTEGER
);

CREATE INDEX IF NOT EXISTS pippi_pages_recipient_unread_idx
  ON pippi_pages(recipient_user_id, read_at, created_at);

CREATE INDEX IF NOT EXISTS pippi_pages_sender_idx
  ON pippi_pages(sender_user_id, created_at);
