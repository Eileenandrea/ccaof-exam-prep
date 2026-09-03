import { Router } from "express";
import { db } from "../db/db.js";
import { questionFromRow } from "../types.js";
import type { FlashcardStateRow, QuestionRow } from "../types.js";

const router = Router();

const DUE_STALE_DAYS = 3;

function isDue(card: {
  timesReviewed: number;
  timesMarkedHard: number;
  lastReviewedAt: string | null;
}): boolean {
  if (card.timesReviewed === 0) return true;
  const hardRatio = card.timesMarkedHard / card.timesReviewed;
  if (hardRatio >= 1 / 3) return true;
  if (!card.lastReviewedAt) return true;
  const staleCutoff = Date.now() - DUE_STALE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(`${card.lastReviewedAt}Z`).getTime() < staleCutoff;
}

// GET /api/flashcards?domain=&due=true
router.get("/", (req, res) => {
  const domain = req.query.domain ? Number(req.query.domain) : undefined;
  const dueOnly = req.query.due === "true";

  const questions = (
    domain
      ? db.prepare("SELECT * FROM questions WHERE domain = ?").all(domain)
      : db.prepare("SELECT * FROM questions").all()
  ) as QuestionRow[];

  const states = db.prepare("SELECT * FROM flashcard_state").all() as FlashcardStateRow[];
  const stateById = new Map(states.map((s) => [s.question_id, s]));

  let cards = questions.map((row) => {
    const q = questionFromRow(row);
    const state = stateById.get(q.id);
    return {
      questionId: q.id,
      domain: q.domain,
      stem: q.stem,
      explanation: q.explanation,
      options: q.options,
      correctOptionIds: q.correctOptionIds,
      lastReviewedAt: state?.last_reviewed_at ?? null,
      timesReviewed: state?.times_reviewed ?? 0,
      timesMarkedHard: state?.times_marked_hard ?? 0,
    };
  });

  cards = cards.filter((c) => !dueOnly || isDue(c));

  cards.sort((a, b) => {
    if ((a.timesReviewed === 0) !== (b.timesReviewed === 0)) {
      return a.timesReviewed === 0 ? -1 : 1;
    }
    const hardRatioA = a.timesReviewed ? a.timesMarkedHard / a.timesReviewed : 0;
    const hardRatioB = b.timesReviewed ? b.timesMarkedHard / b.timesReviewed : 0;
    if (hardRatioA !== hardRatioB) return hardRatioB - hardRatioA;
    return (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? "");
  });

  res.json(cards);
});

// POST /api/flashcards/:questionId/review  { outcome: "easy" | "hard" }
router.post("/:questionId/review", (req, res) => {
  const question = db
    .prepare("SELECT id FROM questions WHERE id = ?")
    .get(req.params.questionId);
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const outcome = req.body?.outcome === "hard" ? "hard" : "easy";
  const existing = db
    .prepare("SELECT * FROM flashcard_state WHERE question_id = ?")
    .get(req.params.questionId) as FlashcardStateRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE flashcard_state SET
         last_reviewed_at = datetime('now'),
         times_reviewed = times_reviewed + 1,
         times_marked_hard = times_marked_hard + ?
       WHERE question_id = ?`
    ).run(outcome === "hard" ? 1 : 0, req.params.questionId);
  } else {
    db.prepare(
      `INSERT INTO flashcard_state (question_id, last_reviewed_at, times_reviewed, times_marked_hard)
       VALUES (?, datetime('now'), 1, ?)`
    ).run(req.params.questionId, outcome === "hard" ? 1 : 0);
  }

  res.json({ ok: true });
});

export default router;
