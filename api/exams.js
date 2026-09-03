import { createClient } from "@supabase/supabase-js";
import { DOMAINS, DEFAULT_EXCLUDE_DAYS } from "../server/domainWeights.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_SERVICE_ROLE_KEY ?? "",
  {
    auth: { persistSession: false },
  },
);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function handler(req, res) {
  try {
    const excludeDays = Number(req.query.excludeDays ?? DEFAULT_EXCLUDE_DAYS);
    const cutoff = new Date(
      Date.now() - excludeDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: recentAttempts } = await supabase
      .from("attempts")
      .select("id")
      .gte("started_at", cutoff);
    const attemptIds = (recentAttempts ?? []).map((r) => r.id);

    let recentQuestionIds = [];
    if (attemptIds.length > 0) {
      const { data: items } = await supabase
        .from("attempt_items")
        .select("question_id")
        .in("attempt_id", attemptIds);
      recentQuestionIds = (items ?? []).map((i) => i.question_id);
    }

    let bankLow = false;
    const selected = [];

    for (const domain of DOMAINS) {
      const { data: pool } = await supabase
        .from("questions")
        .select("*")
        .eq("domain", domain.id);
      const poolArr = pool ?? [];
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
  } catch (e) {
    console.error("exams API error", e);
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
