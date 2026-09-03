import { Router } from "express";
import { db } from "../db/db.js";
import { DOMAINS, QUESTION_BANK_TARGET } from "../domainWeights.js";

const router = Router();

// Bank health: count per domain vs. target share of QUESTION_BANK_TARGET,
// so the UI can show "bank running low" per CLAUDE.md.
router.get("/stats", (_req, res) => {
  const counts = db
    .prepare("SELECT domain, COUNT(*) AS count FROM questions GROUP BY domain")
    .all() as { domain: number; count: number }[];
  const countByDomain = new Map(counts.map((c) => [c.domain, c.count]));

  const stats = DOMAINS.map((d) => {
    const count = countByDomain.get(d.id) ?? 0;
    const target = Math.round(QUESTION_BANK_TARGET * d.weight);
    return {
      domain: d.id,
      name: d.name,
      count,
      target,
      pctOfTarget: target > 0 ? Math.round((count / target) * 100) : 0,
    };
  });

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  res.json({ total, target: QUESTION_BANK_TARGET, byDomain: stats });
});

export default router;
