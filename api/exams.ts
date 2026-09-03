import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { DOMAINS, DEFAULT_EXCLUDE_DAYS } from "../server/domainWeights.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
}

const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: { persistSession: false },
  },
);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const excludeDays = Number(req.query.excludeDays ?? DEFAULT_EXCLUDE_DAYS);
    const cutoff = new Date(
      Date.now() - excludeDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // get recent attempt ids
    const { data: recentAttempts, error: errA } = await supabase
      .from("attempts")
      .select("id")
      .gte("started_at", cutoff);
    if (errA) throw errA;
    const attemptIds = (recentAttempts ?? []).map((r: any) => r.id);

    // collect recently shown question ids
    let recentQuestionIds: string[] = [];
    if (attemptIds.length > 0) {
      const { data: items, error: errB } = await supabase
        .from("attempt_items")
        .select("question_id")
        .in("attempt_id", attemptIds);
      if (errB) throw errB;
      recentQuestionIds = (items ?? []).map((i: any) => i.question_id);
    }

    let bankLow = false;
    const selected: any[] = [];

    for (const domain of DOMAINS) {
      const { data: pool, error: err } = await supabase
        .from("questions")
        .select("*")
        .eq("domain", domain.id);
      if (err) throw err;
      const poolArr = (pool ?? []) as any[];
      if (poolArr.length === 0) continue;

      let eligible = poolArr.filter((q) => !recentQuestionIds.includes(q.id));
      if (eligible.length < domain.itemsPerExam) {
        bankLow = true;
        eligible = poolArr;
      }

      const picked = shuffle(eligible).slice(
        0,
        Math.min(domain.itemsPerExam, eligible.length),
      );
      if (picked.length < domain.itemsPerExam) bankLow = true;
      selected.push(...picked);
    }

    const questions = shuffle(selected);
    res.status(200).json({ questions, bankLow });
  } catch (e: any) {
    console.error("exams API error", e.message || e);
    res.status(500).json({ error: String(e.message ?? e) });
  }
}
