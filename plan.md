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
- **Bug found on first real run, fixed at the schema level (not just prompting)**: a 10-question batch for domain 1 came back with all 10 questions padded to 5 options, and some of those 5 had duplicate ids (e.g. two options both labeled `"d"`). First attempt was a post-hoc `repairOptionCount()` that trimmed to 4 and preserved correct answers — but it assumed original ids were unique, so on the real duplicate-id data it collapsed two different options onto the same final letter and produced *new* duplicate-id errors (a bug in the fix itself). Root-caused and replaced: the generator's `options` schema changed from a variable-length array of `{id, text}` (array length isn't enforceable by structured outputs, confirmed as the actual mechanism of failure) to a **fixed object with four required keys `a`/`b`/`c`/`d`** (`additionalProperties: false`) — this is a JSON-schema shape structured outputs *does* enforce, so "exactly 4, uniquely keyed" became a guarantee instead of a prompt request. `correctOptionIds` items are now schema-`enum`-constrained to `["a","b","c","d"]` too. The now-unnecessary repair function and the array-shape validation checks were deleted rather than left as dead code. Verified offline (no API cost): the raw→app-format conversion (`normalize()`) always yields exactly 4 uniquely-ordered options. Diagnostic logging on any remaining skip is still in place.

## Phase 7 — Polish ✅ DONE
- Real `AboutPage` with the three required disclosures (not affiliated with Anthropic, no real/leaked exam content, scaled score is a labeled approximation with the formula shown) plus notes on bank growth and local-only data storage. Deleted the now-unused `PlaceholderPage.tsx`.
- Added a persistent footer disclosure line (with a link to About) across every page via the `App.tsx` layout, per CLAUDE.md's "footer/about screen" requirement.
- Empty/loading states were already present on Dashboard ("No attempts yet"), Flashcards ("No flashcards match this filter", "reviewed all N cards"), Exam, and Results — verified during this pass rather than rebuilt.
- Fixed a real mobile-usability bug: `ExamPage`'s question-navigator grid was hardcoded to `grid-cols-10`, which is unusable at phone width. Changed to `grid-cols-5 sm:grid-cols-8 md:grid-cols-10`. Nav bar changed to `flex-wrap` so it doesn't overflow on narrow screens.
- Generator error handling (Phase 6) reviewed and confirmed sufficient: per-domain try/catch around the API call + JSON parse, per-question shape validation before insert, and a per-domain DB transaction — a bad batch is skipped/logged, never partially written.
- **Verified live in a headless browser at both desktop (1280px) and mobile (390px, iPhone-sized) viewports**: home, exam (question grid + card layout), dashboard (KPI row, charts, table), flashcards, and about all render correctly with zero console errors at both widths.

## Full end-to-end verification ✅ DONE
Ran one continuous Playwright pass through the real user journey (25 assertions, not just "did it render"):
- Started a full 60-question exam, answered 58 of 60 (2 left deliberately unanswered), flagged 2 questions, jumped around via the nav grid (not just Next/Previous).
- Review-and-submit summary correctly reported "58 of 60 answered" and the 2-unanswered warning.
- Submitted; landed on results with a real raw score, scaled score, pass/fail, per-domain accuracy bars, and item review; the "show correct answers too" toggle correctly revealed passing items.
- Cross-checked the submitted attempt via `GET /api/attempts/:id` directly: `examLength` = 60, `domainBreakdown` covers all 7 domains, and the per-domain totals sum to exactly 60 — the scoring math is internally consistent, not just "looks right" in the UI.
- Took a **4th real attempt** this session, which finally exercised the dashboard's multi-attempt trend rendering for the first time (previous phases only had 1-3 attempts in the DB): score trend line now shows real movement across 4 points, and all 7 per-domain small-multiples show multi-point trends, not just single dots.
- Flashcards: switched the domain filter, flipped a card, marked it Easy, confirmed it advanced to the next card, and confirmed via `GET /api/flashcards` that `timesReviewed` was actually persisted server-side (not just a client-side UI change).
- About page: confirmed all three required disclosures are present in the rendered text.
- Re-ran the mid-exam-refresh resume check as a regression test (still passes after all later changes).
- **Result: 25/25 checks passed, zero console errors, across the entire flow.**

## Explicitly deferred (per CLAUDE.md "out of scope")
- Multi-user accounts, cloud sync, payments — not planned.
- Real Pearson scaled-scoring algorithm — stays an approximation indefinitely.
- Full SM-2 spaced repetition — current simple due-ranking is sufficient unless requested later.

## Suggested build order note
Phases 0–3 give you a working, gradeable daily exam (the core value). Phases 4–5 add the tracking/study layer. Phase 6 is what makes "daily" actually mean something over weeks rather than repeating a small bank. Treat 0–3 as the MVP checkpoint before investing in 4–6.
