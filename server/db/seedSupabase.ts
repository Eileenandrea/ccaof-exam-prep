// One-off script to push server/db/seedData.ts into the Supabase `questions`
// table used by the deployed api/exams.js. Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx server/db/seedSupabase.ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { seedQuestions } from "./seedData.js";
import { DOMAINS } from "../domainWeights.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { count, error: countError } = await supabase
  .from("questions")
  .select("id", { count: "exact", head: true });
if (countError) {
  console.error("Could not read the questions table:", countError.message);
  process.exit(1);
}
if (count && count > 0) {
  console.log(`questions table already has ${count} row(s); skipping to avoid duplicates.`);
  process.exit(0);
}

const rows = seedQuestions.map((q) => ({
  domain: q.domain,
  item_type: q.itemType,
  stem: q.stem,
  options: q.options,
  correct_option_ids: q.correctOptionIds,
  explanation: q.explanation,
}));

const { error: insertError } = await supabase.from("questions").insert(rows);
if (insertError) {
  console.error("Insert failed:", insertError.message);
  process.exit(1);
}

const countByDomain = new Map<number, number>();
for (const q of seedQuestions) {
  countByDomain.set(q.domain, (countByDomain.get(q.domain) ?? 0) + 1);
}
console.log(`Seeded ${seedQuestions.length} questions into Supabase.`);
for (const d of DOMAINS) {
  console.log(`  Domain ${d.id} (${d.name}): ${countByDomain.get(d.id) ?? 0}`);
}
