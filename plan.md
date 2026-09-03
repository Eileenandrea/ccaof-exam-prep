# plan.md — Build Plan for the CCAO-F Exam Prep App

Phased implementation plan derived from `CLAUDE.md` (spec) and `architecture.md` (technical design). Work top to bottom — each phase should leave the app in a runnable state, not just a partial mess.

## Phase 0 — Project setup ✅ DONE
- Scaffolded Vite + React + Tailwind (v4) frontend in `client/`, thin Express server + `better-sqlite3` DB in `server/`.
- SQLite schema (`questions`, `attempts`, `attempt_items`, `flashcard_state`) created via `server/db/migrate.ts` (auto-runs on server boot too).
- `server/domainWeights.ts` holds the 7-domain blueprint table as the single source of truth in code; exposed to the client via `GET /api/domains` rather than duplicated in the frontend.
- Root `package.json` scripts: `npm run dev` (concurrently runs server+client), `npm run server`, `npm run migrate`, `npm run seed`, `npm run generate`.
- Verified: server boots on :4000, migration creates empty tables, `GET /api/health` responds.

## Phase 1 — Seed question bank (small, hand-authored) ✅ DONE
- Hand-authored 85 original scenario-based questions across all 7 domains in `server/db/seedData.ts`, matching blueprint proportions (D1:12, D2:18, D3:10, D4:14, D5:10, D6:13, D7:8), mixed single/multi-select weighted toward single-select.
- Inserted via `server/db/seed.ts` (`npm run seed`) — every question has domain tag, item type, options, correct answer(s), and explanation.
- Verified: `GET /api/questions/stats` shows 85 total with non-trivial counts in every domain (8-18 each), correctly reporting `pctOfTarget` against the 1,000-question long-term target.

## Phase 2 — Exam flow (core loop) ✅ DONE
- `POST /api/exams`: domain-weighted selection (`server/examSelection.ts`), deterministic per-attempt option shuffling (seeded, no extra schema needed), creates attempt + attempt_items.
- `GET /api/exams/:id`, `PATCH /api/exams/:id/items/:questionId` (autosave), `POST /api/exams/:id/submit` (raw + scaled score via `server/scoring.ts`, per-domain breakdown) — all built in `server/routes/exams.ts`.
- `ExamPage`: 60-question nav grid (answered/flagged indicators), single/multi-select `QuestionCard`, flag-for-review, live `Timer` computed from server `startedAt` (survives refresh), 10-min/2-min warning banners, auto-submit at 0, summary screen before final submit.
- Minimal `ResultsPage` (headline scaled score, pass/fail, raw score) — full breakdown/review lands in Phase 3.
- Client scaffold rebuilt (Vite config, tsconfig, index.html, main.tsx, index.css, App.tsx w/ router) after the original `npm create vite` output went missing from disk. Also fixed two environment issues: `client/package.json` was missing its `scripts` block, and Vite 8 (rolldown-based, needs Node ≥20.19) failed to load its native binding on this machine's Node 20.17 — pinned `vite` to `^5.4.11` / `@vitejs/plugin-react` to `^4.3.4` and reinstalled clean, which resolved it.
- **Verified live in a headless browser (Playwright)**: home → start exam → answer + flag Q1 → Next → answer Q2 → Previous → jump via nav grid → Review & Submit summary → Submit → results page showing scaled score/pass-fail, zero console errors. Also verified **mid-exam refresh**: reloaded the exam URL after answering + flagging a question and confirmed both the answer and flag persisted (server-backed resume works).

## Phase 3 — Results / end-of-exam analysis ✅ DONE
- `buildResultsView` (server/routes/exams.ts) now returns `domainBreakdown` as an array sorted weakest-to-strongest with `pct` and a `weak`/`borderline`/`strong` `level` (via `accuracyLevel()` in `server/scoring.ts`), plus a `studyNext` list (2-3 weakest domains, weak preferred over borderline, each with a pointer built from that domain's `taskStatements` in `domainWeights.ts` — no duplicated blueprint text).
- `ResultsPage` fully built out: headline, per-domain accuracy bars (red/amber/green), a "What to study next" callout, and item-by-item review (`ItemReviewRow` component) defaulting to wrong-answers-only with a "Show correct answers too" toggle.
- **Verified live in a headless browser**: took a partial exam, submitted, confirmed the per-domain bars render with correct percentages/labels, "What to study next" lists the weakest domains with real task-statement pointers, and the show-all toggle correctly reveals correct answers too. Zero console errors.

## Phase 4 — Dashboard
- `GET /dashboard`: aggregate score trend, per-domain trend, weakest domain overall, streak/recent attempts.
- `DashboardPage`: score trend line chart with the 720 pass line marked, per-domain trend chart, recent attempts list, weakest-domain-overall callout.
- **Done when**: after 2+ exams, the dashboard shows a real trend line and per-domain movement, not just the latest attempt.

## Phase 5 — Flashcards
- `GET /flashcards?domain=&due=true` using the simple due-ranking from `architecture.md` (never-reviewed first, then worst hard-ratio, then oldest review).
- `FlashcardsPage`: flip-card UI, domain filter, "due today" filter, mark easy/hard on review.
- **Done when**: flashcards are usable independently of starting a full exam, and reviewing updates `flashcard_state`.

## Phase 6 — Daily rotation & bank growth
- Implement the "exclude questions seen in last N days" logic in `POST /exams` (default N=7), with graceful fallback + UI warning when the unseen pool runs low.
- Build the offline generator script (`server/generator/generateQuestions.ts`) that calls the Claude API in batches, tags output with domain + explanation, and inserts into `questions` — run manually or on a schedule to grow the bank toward 1,000 over time.
- **Done when**: running the generator script measurably grows `questions` count per domain, and two exams taken a day apart share few/no questions.

## Phase 7 — Polish
- About/disclosure page: not affiliated with Anthropic, questions are original (not leaked/real exam content), scaled score is an approximation.
- Empty/loading states, mobile-friendly layout for the exam and dashboard views.
- Basic error handling around the generator script (LLM call failures shouldn't corrupt the bank — validate shape before insert).

## Explicitly deferred (per CLAUDE.md "out of scope")
- Multi-user accounts, cloud sync, payments — not planned.
- Real Pearson scaled-scoring algorithm — stays an approximation indefinitely.
- Full SM-2 spaced repetition — current simple due-ranking is sufficient unless requested later.

## Suggested build order note
Phases 0–3 give you a working, gradeable daily exam (the core value). Phases 4–5 add the tracking/study layer. Phase 6 is what makes "daily" actually mean something over weeks rather than repeating a small bank. Treat 0–3 as the MVP checkpoint before investing in 4–6.
