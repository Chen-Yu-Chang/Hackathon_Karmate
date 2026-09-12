-- Karmate database schema — implements TDD section 3 "資料庫綱要 (Database
-- Schema)". Runs on SQLite by default (zero setup). SQLite has no native
-- ENUM type, so enum-like columns are TEXT, validated in application code
-- against the lists in src/constants.js. See README.md for how to point
-- this same shape at real PostgreSQL instead.

-- 3.1 users (用戶表)
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  username          TEXT UNIQUE NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  ssn_enc           TEXT,              -- AES-256-GCM encrypted (section 5)
  bank_account_enc  TEXT,              -- AES-256-GCM encrypted (section 5)
  role              TEXT NOT NULL DEFAULT 'normal', -- normal|business|hunter|admin
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 3.2 reports (投訴與事件表)
CREATE TABLE IF NOT EXISTS reports (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  target_type           TEXT NOT NULL,     -- hotel_enterprise|hotel_individual|driver
  target_name           TEXT NOT NULL,
  target_contact        TEXT NOT NULL,
  description           TEXT NOT NULL,
  media_urls            TEXT NOT NULL DEFAULT '[]', -- JSON array
  is_ai_verified        INTEGER NOT NULL DEFAULT 0,
  choice                TEXT NOT NULL,     -- cash_back|revenge
  status                TEXT NOT NULL DEFAULT 'pending', -- pending|court|revenging|in_progress|completed|rejected
  ai_title              TEXT,
  appeal_deadline       TEXT,
  court_ends_at         TEXT,
  -- the business account that appealed this report into court — this is
  -- how the Court Room knows which logged-in user is "the business owner
  -- being reported" (modify1 §4), distinct from the general audience.
  appealed_by_user_id   TEXT REFERENCES users(id),
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 3.3 court_votes (法庭投票表)
-- Voting itself is free (modify1 §4) — the $0.5 fee moved to court_entries,
-- a one-time fee to enter the room at all. amount_paid is kept at 0 here
-- and left in the shape for compatibility with the original TDD schema.
CREATE TABLE IF NOT EXISTS court_votes (
  id            TEXT PRIMARY KEY,
  report_id     TEXT NOT NULL REFERENCES reports(id),
  voter_id      TEXT NOT NULL REFERENCES users(id),
  amount_paid   REAL NOT NULL DEFAULT 0,
  vote_choice   INTEGER NOT NULL,  -- 1 = 支持復仇, 0 = 反對
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(report_id, voter_id)
);

-- court_entries — modify1 §4: pay $0.5 once to enter a courtroom. The
-- reporter and the appealing business are auto-entered for free (they're
-- the two parties in the case, not paying audience).
CREATE TABLE IF NOT EXISTS court_entries (
  id            TEXT PRIMARY KEY,
  report_id     TEXT NOT NULL REFERENCES reports(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  seat          TEXT NOT NULL,    -- reporter|business|audience
  amount_paid   REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(report_id, user_id)
);

-- court_messages — modify1 §4: chat history visible to everyone who
-- entered the room. Only the reporter/business seats may send `text`;
-- the audience may only send `emoji`.
CREATE TABLE IF NOT EXISTS court_messages (
  id            TEXT PRIMARY KEY,
  report_id     TEXT NOT NULL REFERENCES reports(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  seat          TEXT NOT NULL,    -- reporter|business|audience
  kind          TEXT NOT NULL,    -- text|emoji
  content       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- 3.4 revenge_tasks (復仇接單任務表)
CREATE TABLE IF NOT EXISTS revenge_tasks (
  id              TEXT PRIMARY KEY,
  report_id       TEXT NOT NULL REFERENCES reports(id),
  hunter_id       TEXT REFERENCES users(id),
  revenge_type    TEXT NOT NULL, -- fake_tv_interview|russian_doll|paintball|driver_cancel|custom
  custom_details  TEXT,
  -- open|in_progress|pending_review|completed. modify1 §3 adds
  -- pending_review: the hunter marks their own work done, then an admin
  -- confirms and the reward is paid out.
  status          TEXT NOT NULL DEFAULT 'open',
  deadline        TEXT,
  reward_amount   REAL NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_votes_report ON court_votes(report_id);
CREATE INDEX IF NOT EXISTS idx_tasks_report ON revenge_tasks(report_id);
CREATE INDEX IF NOT EXISTS idx_entries_report ON court_entries(report_id);
CREATE INDEX IF NOT EXISTS idx_messages_report ON court_messages(report_id);
