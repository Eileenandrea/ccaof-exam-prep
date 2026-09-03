# architecture.md — CCAO-F Exam Prep App

Technical design derived from `CLAUDE.md`. `CLAUDE.md` is the source of truth for *what* the app does and the exam blueprint; this file is the source of truth for *how* it's built. If the two ever disagree, `CLAUDE.md` wins and this file should be updated.

## Stack decision

`CLAUDE.md` leaves the storage backend open ("artifact vs. standalone"). This architecture assumes the **standalone app** path, since a 1,000-question bank, daily history tracking, and a real timer/dashboard outgrow what's comfortable inside a single Claude.ai artifact.

- **Frontend**: React (Vite) + Tailwind. Single-page app, client-side routing.
- **Charts**: Recharts (score trend, per-domain trend).
- **Backend**: none required as a separate service — a local Node process (or the frontend talking directly to a local DB via an Electron/Tauri-style bridge, or a thin Express server) is enough. Default to a **thin local Express API** on localhost so the frontend stays a normal fetch-based SPA and the DB access stays server-side.
- **Database**: SQLite (via `better-sqlite3`), single file on disk (`data/ccaof.db`). Chosen over JSON files because the question bank (1,000 rows) and growing attempt history benefit from indexed queries (by domain, by "last seen date," by attempt) rather than loading/parsing a full JSON blob every time.
- **Question generation**: an LLM call (Claude via API) used offline/on-demand to grow the bank in batches, not live during exam-taking. Exam-taking always reads from the already-generated bank in SQLite — never blocks on a live model call.

If this is instead built as a Claude.ai artifact, swap the SQLite layer for `window.storage` (personal scope) as described in `CLAUDE.md`, and drop the Express server — the React code and component structure below still apply.

## High-level components

```
┌─────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                     │
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │  Exam      │ │ Dashboard │ │ Flashcards│ │  Bank      │ │
│  │  flow      │ │           │ │           │ │  admin     │ │
│  └─────┬──────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ │
│        └───────────────┴─────────────┴─────────────┘       │
│                          │ fetch()                          │
└──────────────────────────┼──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                    Local API (Express)                     │
│  /exams  /attempts  /questions  /flashcards  /dashboard    │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                     SQLite (ccaof.db)                      │
│  questions | attempts | attempt_items | flashcard_state    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ batch fill (offline script)
                  ┌─────────┴─────────┐
                  │  Question generator │  (Claude API)
                  └─────────────────────┘
```

## Data model

### `questions`
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| domain | INTEGER | 1–7, matches blueprint table in CLAUDE.md |
| item_type | TEXT | `single` or `multi` |
| stem | TEXT | scenario + question |
| options | JSON | `[{id, text}]` |
| correct_option_ids | JSON | array (length 1 for `single`) |
| explanation | TEXT | why the correct answer is correct |
| difficulty | TEXT NULL | optional, self-rated or generated |
| times_shown | INTEGER | default 0 |
| times_correct | INTEGER | default 0 |
| created_at | TEXT | ISO date |

### `attempts`
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| started_at | TEXT | |
| submitted_at | TEXT NULL | null while in progress |
| raw_score | INTEGER NULL | out of 60 |
| scaled_score | INTEGER NULL | 100–1000 approximation |
| passed | BOOLEAN NULL | scaled_score >= 720 |
| domain_breakdown | JSON NULL | `{domain: {correct, total}}` computed at submit time |

### `attempt_items`
| column | type | notes |
|---|---|---|
| attempt_id | TEXT FK → attempts.id | |
| question_id | TEXT FK → questions.id | |
| position | INTEGER | order shown in that exam |
| selected_option_ids | JSON NULL | null until answered |
| flagged_for_review | BOOLEAN | |
| is_correct | BOOLEAN NULL | computed at submit |

Composite PK: `(attempt_id, question_id)`.

### `flashcard_state`
| column | type | notes |
|---|---|---|
| question_id | TEXT PK, FK → questions.id | one card per question, or a separate `concept` field if standalone concept cards are added later |
| last_reviewed_at | TEXT NULL | |
| times_reviewed | INTEGER | default 0 |
| times_marked_hard | INTEGER | default 0 |

Simple "due for review" priority = questions never reviewed, then questions with highest `times_marked_hard / times_reviewed` ratio, then oldest `last_reviewed_at` — no full SM-2 needed per CLAUDE.md.

## API surface (local Express server)

- `POST /exams` — generate a new 60-question attempt: selects from `questions` per domain weighting, excluding IDs shown in the last N days (per `flashcard`-independent "last seen" tracked via `attempt_items` join), shuffles order/options, creates an `attempts` row + 60 `attempt_items` rows, returns the attempt.
- `GET /exams/:id` — resume an in-progress attempt.
- `PATCH /exams/:id/items/:questionId` — save an answer / flag for review (autosave as the user progresses).
- `POST /exams/:id/submit` — lock the attempt, compute raw/scaled score, per-domain breakdown, `is_correct` per item; returns full analysis payload.
- `GET /attempts` — list past attempts (for dashboard).
- `GET /attempts/:id` — full item-by-item review for one past attempt.
- `GET /dashboard` — aggregated stats: score trend, per-domain trend, weakest domain overall, streak.
- `GET /flashcards?domain=&due=true` — flashcard queue.
- `POST /flashcards/:questionId/review` — record a review outcome (easy/hard).
- `GET /questions/stats` — bank health: count per domain vs. target, so the UI can show "bank running low" per CLAUDE.md.
- (offline, not exposed to the SPA) a generator script that calls the Claude API to write new questions into `questions`, tagged with domain + explanation before insert, as required by CLAUDE.md.

## Scoring approximation

`scaled_score = round(100 + (raw_score / 60) * 900)`, clamped to [100, 1000]. This is a linear approximation, explicitly labeled as such in the UI (per CLAUDE.md — not Pearson's real algorithm). `passed = scaled_score >= 720`.

## Frontend structure

```
src/
  pages/
    ExamPage.tsx        # timer, question nav, flag/review, submit
    ResultsPage.tsx      # headline, per-domain breakdown, item review
    DashboardPage.tsx    # trend charts, streak, weakest domain
    FlashcardsPage.tsx   # domain/due filter, flip card
    AboutPage.tsx        # "not affiliated with Anthropic" disclosure
  components/
    Timer.tsx
    QuestionCard.tsx
    DomainBadge.tsx
    ScoreTrendChart.tsx
    DomainTrendChart.tsx
    ItemReviewRow.tsx
    Flashcard.tsx
  lib/
    api.ts               # fetch wrappers for the Express API
    scoring.ts            # scaled-score approximation, shared so it's defined once
    domainWeights.ts       # the blueprint table from CLAUDE.md, single source in code
server/
  index.ts                # Express app, mounts routes
  db.ts                    # better-sqlite3 connection + migrations
  routes/
    exams.ts, attempts.ts, questions.ts, flashcards.ts, dashboard.ts
  generator/
    generateQuestions.ts   # offline batch script, calls Claude API
data/
  ccaof.db                 # sqlite file (gitignored)
```

## Non-functional notes

- Keep `domainWeights.ts` as the **single** place the 7-domain weight table lives in code (mirrors CLAUDE.md's instruction not to duplicate it).
- Timer must survive a page refresh mid-exam — persist `started_at` server-side and compute remaining time from it, not from client-side state alone.
- All scoring/analysis logic lives server-side so the dashboard and results page can't drift out of sync with what was actually stored.
