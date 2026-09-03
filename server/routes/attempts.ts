import { Router } from "express";
import { db } from "../db/db.js";
import type { AttemptRow } from "../types.js";
import { buildResultsView } from "./exams.js";

const router = Router();

// GET /api/attempts — list past (submitted) attempts, most recent first
router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM attempts WHERE submitted_at IS NOT NULL ORDER BY submitted_at DESC`
    )
    .all() as AttemptRow[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      submittedAt: r.submitted_at,
      rawScore: r.raw_score,
      scaledScore: r.scaled_score,
      passed: !!r.passed,
      domainBreakdown: r.domain_breakdown ? JSON.parse(r.domain_breakdown) : {},
    }))
  );
});

// GET /api/attempts/:id — full item-by-item review for one past attempt
router.get("/:id", (req, res) => {
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(req.params.id) as
    | AttemptRow
    | undefined;
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (!attempt.submitted_at) {
    res.status(409).json({ error: "Attempt not yet submitted" });
    return;
  }
  res.json(buildResultsView(attempt));
});

export default router;
