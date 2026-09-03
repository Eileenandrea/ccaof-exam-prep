import { db } from "./db.js";

db.exec(`
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  domain INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('single', 'multi')),
  stem TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_option_ids TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT,
  times_shown INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions(domain);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT,
  raw_score INTEGER,
  scaled_score INTEGER,
  passed INTEGER,
  domain_breakdown TEXT
);

CREATE TABLE IF NOT EXISTS attempt_items (
  attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  position INTEGER NOT NULL,
  selected_option_ids TEXT,
  flagged_for_review INTEGER NOT NULL DEFAULT 0,
  is_correct INTEGER,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_items_question ON attempt_items(question_id);

CREATE TABLE IF NOT EXISTS flashcard_state (
  question_id TEXT PRIMARY KEY REFERENCES questions(id),
  last_reviewed_at TEXT,
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  times_marked_hard INTEGER NOT NULL DEFAULT 0
);
`);

console.log("Migration complete:", db.name);
