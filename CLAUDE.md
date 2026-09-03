# CLAUDE.md — CCAO-F Exam Prep App

This file guides Claude Code when building and modifying this project. Read it in full before making changes.

## What this app is

A self-study tool for the **Claude Certified Associate – Foundations (CCAO-F)** exam. The core loop:

1. Take a **60-question timed exam** (mirrors the real exam: 120 minutes, multiple-choice and multiple-response).
2. Get an **end-of-exam breakdown**: score, pass/fail against a 720/1000 scaled bar, per-domain accuracy, and an item-by-item review (question, your answer, correct answer, explanation) for everything you got wrong — and optionally everything you got right too.
3. See a **dashboard** tracking every exam attempt over time: overall trend, per-domain trend, weakest domains, streaks.
4. Study with **flashcards** generated from the same question bank / domain content, independent of the exam flow.
5. Come back **daily** and get a **new-ish** 60-question set — not the exact same 60 every time, but drawn from a large enough bank (or generated) that repeats are rare, while still matching the real exam's domain weighting.

This is a personal study tool, not a product to publish or sell, and not affiliated with or endorsed by Anthropic. Say so in the app's footer/about screen.

## Exam blueprint to encode (source of truth for question generation)

Based on Anthropic's published CCAO-F Exam Guide v1.0 (effective July 2026). If the person tells you this has changed, update this table — don't silently trust stale info.

| # | Domain | Weight | Approx. items per 60-Q exam |
|---|--------|--------|------------------------------|
| 1 | Prompting and Task Execution | 14% | ~8 |
| 2 | Output Evaluation and Validation | 21% | ~13 |
| 3 | Product and Model Selection | 12% | ~7 |
| 4 | Workflow Integration and Solution Design | 16% | ~10 |
| 5 | Configuration and Knowledge Management | 12% | ~7 |
| 6 | Governance, Risk, and Responsible Use | 15% | ~9 |
| 7 | Troubleshooting and Optimisation | 10% | ~6 |

Each generated 60-question exam should sample roughly in these proportions (allow ±1 item of rounding slack), so no single exam is domain-imbalanced.

Task statements per domain (use these to keep generated questions on-blueprint, not just topically related):

- **Domain 1**: create effective prompts for business/technical tasks; apply task decomposition; iterate prompts to improve output; adapt prompting strategy to task type (analysis, research, drafting, brainstorming).
- **Domain 2**: evaluate outputs for accuracy/completeness; identify hallucinations, inconsistencies, bias; apply fact-checking/validation; decide when human review is required; edit/adapt/refine/compare outputs for audience; curate info and pick output format (artifacts, inline, structured data).
- **Domain 3**: select the right product feature (Projects, research mode, chat, artifacts); differentiate model types (Haiku/Sonnet/Opus) by cost/speed/quality; manage context limits (restart, summarize, persist).
- **Domain 4**: use Claude for requirements analysis and use cases; research/planning/process optimization; solution design/development/iteration; integrate Claude into existing workflows; communicate Claude's value and limitations to stakeholders.
- **Domain 5**: configure Projects with instructions and knowledge sources; manage uploaded knowledge and connectors (Google Drive, Gmail, etc.); write system-level instructions; maintain/update configs and knowledge over time (conflicting, missing, outdated info).
- **Domain 6**: identify appropriate vs. inappropriate use cases; apply data sensitivity/regulatory/privacy considerations; follow org AI policy/governance; understand ethical implications.
- **Domain 7**: diagnose why a prompt/output is underperforming; adjust approach based on feedback/results; optimize workflows for efficiency.

## Question format requirements

Match the real exam's item style as closely as possible:

- **Item types**: single-select multiple choice (4 options) and multiple-response ("select 2" / "select 3") — mix both, weighted toward single-select since that's the dominant real-exam format.
- **Style**: scenario-based, not pure recall. Prefer "You are working on X, Claude does Y, what should you do / what happened / what's the best next step?" over "What is a hallucination?" Ground every item in a workplace scenario (marketing, ops, PM, education, communications, knowledge work — the exam's stated audience).
- **Distractors**: plausible, not silly. A wrong answer should represent a common misconception (e.g., "always pick the most capable model" is a realistic wrong answer for a model-selection question), not an obviously absurd option.
- **No real exam content**: never claim these are leaked/real Anthropic exam questions. They are original questions written to the public blueprint. Say this explicitly somewhere in the app (about page or first-run message) so the person doesn't over-trust question provenance.

## Question bank & daily rotation

- Maintain a bank large enough that a daily 60-question exam feels "new" — target **1,000 questions total** (roughly 16–17x one exam's worth), distributed across the 7 domains in the same proportions as the exam blueprint table above (e.g., ~210 for Domain 2, ~140 for Domain 4, ~100 for Domain 7, etc.). Grow toward this incrementally rather than requiring it all up front — the app should work with a partial bank (e.g., 60–100 questions) from day one and keep expanding in the background or via batch generation runs.
- Each day's exam: exclude questions answered in the last N days (configurable, default 7 — at 1,000 questions and 60/day, a full unseen rotation spans over two weeks) when the bank is large enough to do so; fall back to allowing repeats only when the unseen pool runs low, and flag in the UI when that's happening ("bank is running low, some repeats today").
- Track question metadata: id, domain, item type, options, correct answer(s), explanation, difficulty (optional), times shown, times answered correctly (for spaced-repetition-style prioritization later — surface weak questions more often).
- New questions can be generated on demand (e.g., via an LLM call) or hand-authored and stored — either is fine, but every question must carry a domain tag and explanation before it enters the bank.

## Exam flow

1. **Start exam**: generate/select 60 questions per the domain distribution above; shuffle order and option order.
2. **Timer**: 120-minute countdown, visible, non-blocking (don't force-submit without warning — warn at 10 and 2 minutes remaining).
3. **Navigation**: allow moving between questions, flagging for review, and a summary screen before final submit (mirrors real exam behavior of reviewing before submitting).
4. **Scoring**: report both a raw score (X/60) and a scaled score mapped to the 100–1000 range with 720 as the passing threshold — a simple linear scaling from raw % is a reasonable approximation; document this as an approximation, not the real Pearson scaling algorithm (which isn't public).

## End-of-exam analysis (required)

After submission, show:

- **Headline**: scaled score, pass/fail against 720, raw score.
- **Per-domain breakdown**: accuracy % for each of the 7 domains, sorted weakest to strongest, visually flagged (e.g., red/yellow/green) against a reasonable target (e.g., <60% weak, 60–80% borderline, 80%+ strong).
- **Item-by-item review**: every question, the answer(s) you selected, the correct answer(s), and the explanation of why that's correct — for wrong answers by default, with a toggle to also show correct ones.
- **"What to study next"**: a short auto-generated list of the 2–3 weakest domains with a one-line pointer to what to review (pull the relevant task statements from the blueprint table above).

## Dashboard (required)

Across all past exam attempts, show:

- Score trend over time (line chart: scaled score per attempt, with the 720 passing line marked).
- Per-domain accuracy trend over time (so the person can see if a weak domain is actually improving).
- Current streak / most recent attempts list with date, score, pass-fail.
- Weakest domain overall (aggregated across all attempts, not just the latest).

## Flashcards (required, separate from exams)

- Generated from the same question bank and/or standalone concept cards (term/concept front, explanation back) tagged by domain.
- Browsable by domain or "due for review" (simple spaced repetition: cards missed more often or not reviewed recently surface first is enough — no need for a full SM-2 algorithm unless asked).
- Should not require starting a full 60-question exam to use.

## Data & persistence

- All exam attempts, question bank, and flashcard review state must persist locally between sessions (this is a single-user personal study tool — no auth system needed unless requested).
- If built as a Claude.ai artifact: use the artifact `window.storage` API (personal, non-shared) — never `localStorage`/`sessionStorage`. Batch related data into single keys (e.g., one `attempts:{examId}` key holding the full attempt record, one `question-bank` key or a small number of paginated keys) rather than many small per-item calls.
- If built as a standalone app (e.g., with Claude Code): a local file-based or embedded DB (SQLite, JSON file, IndexedDB for a web app) is fine — pick what fits the stack the person is using and state the choice explicitly rather than assuming.

## Explicitly out of scope unless asked

- No claim of affiliation with Anthropic, no claim of using real/leaked exam questions.
- No multi-user accounts, no cloud sync, no payment/paywall.
- No attempt to reverse-engineer Pearson's actual scaled-scoring algorithm — approximate and label it as such.

## Working style for this project

- When adding features, keep the domain-weighted sampling logic in one place (don't duplicate the weight table across files).
- Prefer generating fresh scenario-based questions over reusing templated fill-in-the-blank stems — variety matters more here than volume.
- Whenever the CCAO-F blueprint might have changed (new exam guide version), flag it to the user rather than assuming this file's weights are still current.
