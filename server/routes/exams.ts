import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/db.js";
import { selectExamQuestions, shuffledOptionsForItem } from "../examSelection.js";
import { questionFromRow } from "../types.js";
import type { AttemptItemRow, AttemptRow, QuestionRow } from "../types.js";
import { scaledScore, isPassing, accuracyLevel } from "../scoring.js";
import { DOMAINS, DEFAULT_EXCLUDE_DAYS, EXAM_LENGTH } from "../domainWeights.js";

const router = Router();

function buildExamView(attempt: AttemptRow) {
  const items = db
    .prepare(
      "SELECT * FROM attempt_items WHERE attempt_id = ? ORDER BY position"
    )
    .all(attempt.id) as AttemptItemRow[];

  const questionRows = db
    .prepare(
      `SELECT * FROM questions WHERE id IN (${items.map(() => "?").join(",")})`
    )
    .all(...items.map((i) => i.question_id)) as QuestionRow[];
  const questionById = new Map(questionRows.map((q) => [q.id, questionFromRow(q)]));

  const questions = items.map((item) => {
    const q = questionById.get(item.question_id)!;
    return {
      questionId: q.id,
      domain: q.domain,
      itemType: q.itemType,
      stem: q.stem,
      options: shuffledOptionsForItem(q.options, attempt.id, q.id),
      position: item.position,
      selectedOptionIds: item.selected_option_ids ? JSON.parse(item.selected_option_ids) : [],
      flaggedForReview: !!item.flagged_for_review,
    };
  });

  return {
    id: attempt.id,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    durationMinutes: 120,
    questions,
  };
}

// POST /api/exams — generate a new 60-question attempt
router.post("/", (req, res) => {
  const excludeDays = Number(req.body?.excludeDays ?? DEFAULT_EXCLUDE_DAYS);
  const { questions, bankLow } = selectExamQuestions(excludeDays);

  if (questions.length === 0) {
    res.status(400).json({ error: "Question bank is empty. Seed questions before starting an exam." });
    return;
  }

  const attemptId = uuidv4();
  const insertAttempt = db.prepare(
    "INSERT INTO attempts (id, started_at) VALUES (?, datetime('now'))"
  );
  const insertItem = db.prepare(
    `INSERT INTO attempt_items (attempt_id, question_id, position, selected_option_ids, flagged_for_review, is_correct)
     VALUES (?, ?, ?, NULL, 0, NULL)`
  );

  const tx = db.transaction(() => {
    insertAttempt.run(attemptId);
    questions.forEach((q, idx) => insertItem.run(attemptId, q.id, idx));
    db.prepare(
      "UPDATE questions SET times_shown = times_shown + 1 WHERE id IN (" +
        questions.map(() => "?").join(",") +
        ")"
    ).run(...questions.map((q) => q.id));
  });
  tx();

  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(attemptId) as AttemptRow;
  res.status(201).json({ ...buildExamView(attempt), bankLow, examLength: questions.length });
});

// GET /api/exams/:id — resume an in-progress (or view a submitted) attempt
router.get("/:id", (req, res) => {
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(req.params.id) as
    | AttemptRow
    | undefined;
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  res.json(buildExamView(attempt));
});

// PATCH /api/exams/:id/items/:questionId — autosave an answer / flag
router.patch("/:id/items/:questionId", (req, res) => {
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(req.params.id) as
    | AttemptRow
    | undefined;
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.submitted_at) {
    res.status(409).json({ error: "Attempt already submitted" });
    return;
  }

  const { selectedOptionIds, flaggedForReview } = req.body as {
    selectedOptionIds?: string[];
    flaggedForReview?: boolean;
  };

  const existing = db
    .prepare("SELECT * FROM attempt_items WHERE attempt_id = ? AND question_id = ?")
    .get(req.params.id, req.params.questionId) as AttemptItemRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Question not part of this attempt" });
    return;
  }

  db.prepare(
    `UPDATE attempt_items SET
       selected_option_ids = COALESCE(?, selected_option_ids),
       flagged_for_review = COALESCE(?, flagged_for_review)
     WHERE attempt_id = ? AND question_id = ?`
  ).run(
    selectedOptionIds !== undefined ? JSON.stringify(selectedOptionIds) : null,
    flaggedForReview !== undefined ? (flaggedForReview ? 1 : 0) : null,
    req.params.id,
    req.params.questionId
  );

  res.json({ ok: true });
});

// POST /api/exams/:id/submit — lock the attempt, compute scores
router.post("/:id/submit", (req, res) => {
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(req.params.id) as
    | AttemptRow
    | undefined;
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.submitted_at) {
    res.json(buildResultsView(attempt));
    return;
  }

  const items = db
    .prepare("SELECT * FROM attempt_items WHERE attempt_id = ? ORDER BY position")
    .all(req.params.id) as AttemptItemRow[];
  const questionRows = db
    .prepare(`SELECT * FROM questions WHERE id IN (${items.map(() => "?").join(",")})`)
    .all(...items.map((i) => i.question_id)) as QuestionRow[];
  const questionById = new Map(questionRows.map((q) => [q.id, questionFromRow(q)]));

  const domainBreakdown: Record<number, { correct: number; total: number }> = {};
  for (const d of DOMAINS) domainBreakdown[d.id] = { correct: 0, total: 0 };

  let rawScore = 0;
  const updateItem = db.prepare(
    "UPDATE attempt_items SET is_correct = ? WHERE attempt_id = ? AND question_id = ?"
  );
  const updateQuestionStat = db.prepare(
    "UPDATE questions SET times_correct = times_correct + 1 WHERE id = ?"
  );

  const tx = db.transaction(() => {
    for (const item of items) {
      const q = questionById.get(item.question_id)!;
      const selected: string[] = item.selected_option_ids ? JSON.parse(item.selected_option_ids) : [];
      const correctSet = new Set(q.correctOptionIds);
      const selectedSet = new Set(selected);
      const isCorrect =
        correctSet.size === selectedSet.size &&
        [...correctSet].every((id) => selectedSet.has(id));

      updateItem.run(isCorrect ? 1 : 0, req.params.id, item.question_id);
      if (isCorrect) {
        rawScore++;
        updateQuestionStat.run(q.id);
      }
      domainBreakdown[q.domain].total++;
      if (isCorrect) domainBreakdown[q.domain].correct++;
    }

    const scaled = scaledScore(rawScore, items.length);
    db.prepare(
      `UPDATE attempts SET
         submitted_at = datetime('now'),
         raw_score = ?,
         scaled_score = ?,
         passed = ?,
         domain_breakdown = ?
       WHERE id = ?`
    ).run(rawScore, scaled, isPassing(scaled) ? 1 : 0, JSON.stringify(domainBreakdown), req.params.id);
  });
  tx();

  const updated = db.prepare("SELECT * FROM attempts WHERE id = ?").get(req.params.id) as AttemptRow;
  res.json(buildResultsView(updated));
});

export function buildResultsView(attempt: AttemptRow) {
  const items = db
    .prepare("SELECT * FROM attempt_items WHERE attempt_id = ? ORDER BY position")
    .all(attempt.id) as AttemptItemRow[];
  const questionRows = db
    .prepare(`SELECT * FROM questions WHERE id IN (${items.map(() => "?").join(",")})`)
    .all(...items.map((i) => i.question_id)) as QuestionRow[];
  const questionById = new Map(questionRows.map((q) => [q.id, questionFromRow(q)]));

  const review = items.map((item) => {
    const q = questionById.get(item.question_id)!;
    return {
      questionId: q.id,
      domain: q.domain,
      itemType: q.itemType,
      stem: q.stem,
      options: shuffledOptionsForItem(q.options, attempt.id, q.id),
      selectedOptionIds: item.selected_option_ids ? JSON.parse(item.selected_option_ids) : [],
      correctOptionIds: q.correctOptionIds,
      isCorrect: !!item.is_correct,
      explanation: q.explanation,
    };
  });

  const rawBreakdown: Record<number, { correct: number; total: number }> = attempt.domain_breakdown
    ? JSON.parse(attempt.domain_breakdown)
    : {};

  const domainBreakdown = DOMAINS.filter((d) => rawBreakdown[d.id]?.total > 0)
    .map((d) => {
      const { correct, total } = rawBreakdown[d.id];
      const pct = correct / total;
      return { domain: d.id, name: d.name, correct, total, pct, level: accuracyLevel(pct) };
    })
    .sort((a, b) => a.pct - b.pct);

  // "What to study next": the 2-3 weakest domains, preferring weak (<60%) over
  // borderline (60-80%), pulling the pointer text from the blueprint's task
  // statements (server/domainWeights.ts) per CLAUDE.md.
  const weak = domainBreakdown.filter((d) => d.level === "weak");
  const borderline = domainBreakdown.filter((d) => d.level === "borderline");
  const studyNext = [...weak, ...borderline].slice(0, 3).map((d) => {
    const domain = DOMAINS.find((dm) => dm.id === d.domain)!;
    return {
      domain: d.domain,
      name: d.name,
      pct: d.pct,
      pointer: domain.taskStatements.slice(0, 2).join("; "),
    };
  });

  return {
    id: attempt.id,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    rawScore: attempt.raw_score,
    examLength: items.length,
    scaledScore: attempt.scaled_score,
    passed: !!attempt.passed,
    domainBreakdown,
    studyNext,
    review,
  };
}

export default router;
