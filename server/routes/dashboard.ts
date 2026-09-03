import { Router } from "express";
import { db } from "../db/db.js";
import { DOMAINS } from "../domainWeights.js";
import type { AttemptRow } from "../types.js";

const router = Router();

function computeStreak(days: Set<string>): number {
  if (days.size === 0) return 0;
  const sorted = [...days].sort().reverse();
  let streak = 1;
  const cursor = new Date(`${sorted[0]}T00:00:00Z`);
  for (let i = 1; i < sorted.length; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const expected = cursor.toISOString().slice(0, 10);
    if (sorted[i] === expected) streak++;
    else break;
  }
  return streak;
}

router.get("/", (_req, res) => {
  const attempts = db
    .prepare(
      "SELECT * FROM attempts WHERE submitted_at IS NOT NULL ORDER BY submitted_at ASC"
    )
    .all() as AttemptRow[];

  const scoreTrend = attempts.map((a) => ({
    attemptId: a.id,
    submittedAt: a.submitted_at,
    scaledScore: a.scaled_score,
    passed: !!a.passed,
  }));

  const domainTrend = attempts.map((a) => {
    const breakdown = a.domain_breakdown ? JSON.parse(a.domain_breakdown) : {};
    const pctByDomain: Record<number, number | null> = {};
    for (const d of DOMAINS) {
      const b = breakdown[d.id];
      pctByDomain[d.id] = b && b.total > 0 ? b.correct / b.total : null;
    }
    return { attemptId: a.id, submittedAt: a.submitted_at, pctByDomain };
  });

  const aggregate: Record<number, { correct: number; total: number }> = {};
  for (const d of DOMAINS) aggregate[d.id] = { correct: 0, total: 0 };
  for (const a of attempts) {
    const breakdown = a.domain_breakdown ? JSON.parse(a.domain_breakdown) : {};
    for (const d of DOMAINS) {
      const b = breakdown[d.id];
      if (b) {
        aggregate[d.id].correct += b.correct;
        aggregate[d.id].total += b.total;
      }
    }
  }
  const weakestOverall = DOMAINS.map((d) => ({
    domain: d.id,
    name: d.name,
    correct: aggregate[d.id].correct,
    total: aggregate[d.id].total,
    pct: aggregate[d.id].total > 0 ? aggregate[d.id].correct / aggregate[d.id].total : null,
  })).sort((a, b) => (a.pct ?? 1) - (b.pct ?? 1));

  const days = new Set(attempts.map((a) => (a.submitted_at as string).slice(0, 10)));
  const streak = computeStreak(days);

  const recent = [...attempts]
    .reverse()
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      submittedAt: a.submitted_at,
      rawScore: a.raw_score,
      scaledScore: a.scaled_score,
      passed: !!a.passed,
    }));

  res.json({
    totalAttempts: attempts.length,
    scoreTrend,
    domainTrend,
    weakestOverall,
    streak,
    recent,
  });
});

export default router;
