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

## Phase 4 — Dashboard ✅ DONE
- `GET /api/dashboard` (built in Phase 0, `server/routes/dashboard.ts`): score trend, per-domain trend, weakest-domain-overall aggregation, day-based streak, recent attempts list.
- `DashboardPage` built per the **dataviz skill**: KPI row (`StatTile`: attempts, latest score, streak, weakest domain), `ScoreTrendChart` (line chart, dashed 720 pass-line reference, dots colored by pass/fail status color), `DomainTrendGrid` — 7 domains sits at the series-count "token ceiling" per the skill's guidance, so per-domain trend is **faceted into small multiples** (one mini single-hue chart per domain with 60%/80% reference lines) instead of a 7-line spaghetti chart — plus a recent-attempts table. Chart colors pulled from the skill's validated reference palette (`client/src/lib/chartTokens.ts`), validated via `scripts/validate_palette.js` (all checks pass). Empty state included for zero attempts.
- Typecheck (`tsc -b --noEmit`) passes clean; confirmed via API that 3 real attempts exist in the DB for the trend to render against.
- **Not yet re-verified with a live browser screenshot this session** (the in-progress Playwright check was interrupted) — worth a quick visual pass (chart rendering, tooltip, small-multiples layout) next time the dev server is up, though nothing in the code/typecheck suggests an issue.

## Phase 5 — Flashcards ✅ DONE
- `GET /api/flashcards?domain=&due=true` and `POST /api/flashcards/:questionId/review` (built in Phase 0, `server/routes/flashcards.ts`) — due-ranking is never-reviewed first, then worst hard-ratio, then oldest review; "due" = never reviewed, hard-ratio ≥ 1/3, or stale > 3 days.
- `FlashcardsPage` + `Flashcard` flip-card component: domain filter dropdown, "due for review only" toggle, click-to-flip (question → correct answer + explanation), Easy/Hard buttons that record the review and advance to the next card, "reviewed all N cards" end state.
- Reachable directly from the nav bar — no need to start an exam first.
- Typecheck clean; confirmed via API that `GET /api/flashcards` returns all 85 seeded cards (all "due" since none reviewed yet) and the domain filter/due-only query params work.
- **Not yet re-verified with a live browser click-through this session** — worth a quick visual pass (flip animation/layout, Easy/Hard advancing correctly) next time the dev server is up.

## Phase 6 — Daily rotation & bank growth ✅ DONE
- "Exclude questions seen in last N days" (default N=7) was already implemented in `server/examSelection.ts` during Phase 0/2 — falls back to allowing repeats per-domain when the unseen pool runs low, and `POST /api/exams` returns `bankLow`, which `ExamPage` already surfaces as a "Bank running low — some repeats today" banner.
- Built `server/generator/generateQuestions.ts` (`npm run generate [-- --domain N] [-- --count N]`): calls the Claude API (`claude-opus-4-8`, adaptive thinking, `output_config.format` json_schema structured outputs so the model's response is guaranteed well-formed JSON) in per-domain batches, tops each domain up toward its share of the 1,000-question target, passes the domain's existing stems in the prompt to discourage near-duplicates, validates every generated question (option count/ids, correct-answer consistency, non-trivial stem/explanation length) before inserting, and skips/logs anything invalid rather than corrupting the bank.
- Along the way: the root `package.json` had pinned `@anthropic-ai/sdk@^0.27.3` (a stale guess from before I'd checked); updated to the actual current `^0.123.0`.
- **Verified**: `tsc --noEmit` compiles clean against the real installed SDK types (confirms `output_config`/`thinking`/`stream()` usage matches the actual API surface, not a guess). No `ANTHROPIC_API_KEY` is configured in this environment, so I did not run the generator against the live API (that spends real money and needs your go-ahead) — confirmed instead that it fails with a clear, non-crashing error when the key is missing, and unit-tested the validation function's rejection logic against six malformed-question cases (all caught correctly).
- **Still needed before this phase delivers real value**: you'll need to set `ANTHROPIC_API_KEY` (env var or `.env` file) and actually run `npm run generate` some number of times to grow the bank past the current 85 questions toward 1,000 — the "two exams a day apart share few/no questions" outcome only becomes true once the bank is large.

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
