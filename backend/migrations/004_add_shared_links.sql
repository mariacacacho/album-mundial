CREATE TABLE IF NOT EXISTS shared_links (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username TEXT NOT NULL,
  repeats JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_shared_links_expires ON shared_links(expires_at);
