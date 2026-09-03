import { db } from "./db/db.js";
import { DOMAINS, DEFAULT_EXCLUDE_DAYS } from "./domainWeights.js";
import { QuestionRow } from "./types.js";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic shuffle seeded by a string (e.g. `${attemptId}:${questionId}`)
// so option order stays stable across GET /exams/:id calls (resume, refresh)
// without needing to persist a shuffled copy per attempt.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let state = h >>> 0 || 1;
  const rand = () => {
    // mulberry32
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffledOptionsForItem<T extends { id: string }>(
  options: T[],
  attemptId: string,
  questionId: string
): T[] {
  return seededShuffle(options, `${attemptId}:${questionId}`);
}

export interface ExamSelectionResult {
  questions: QuestionRow[];
  bankLow: boolean;
}

// Domain-weighted selection excluding questions shown in the last `excludeDays`
// days when the unseen pool is large enough; falls back to allowing repeats
// (and flags it) when a domain's unseen pool runs low. Per CLAUDE.md's daily
// rotation requirement.
export function selectExamQuestions(excludeDays: number = DEFAULT_EXCLUDE_DAYS): ExamSelectionResult {
  const cutoff = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000).toISOString();

  const recentlyShown = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT ai.question_id AS id
           FROM attempt_items ai
           JOIN attempts a ON a.id = ai.attempt_id
           WHERE a.started_at >= ?`
        )
        .all(cutoff) as { id: string }[]
    ).map((r) => r.id)
  );

  let bankLow = false;
  const selected: QuestionRow[] = [];

  for (const domain of DOMAINS) {
    const pool = db
      .prepare("SELECT * FROM questions WHERE domain = ?")
      .all(domain.id) as QuestionRow[];

    if (pool.length === 0) continue;

    let eligible = pool.filter((q) => !recentlyShown.has(q.id));
    if (eligible.length < domain.itemsPerExam) {
      bankLow = true;
      eligible = pool;
    }

    const picked = shuffle(eligible).slice(0, Math.min(domain.itemsPerExam, eligible.length));
    if (picked.length < domain.itemsPerExam) bankLow = true;
    selected.push(...picked);
  }

  return { questions: shuffle(selected), bankLow };
}
