import { v4 as uuidv4 } from "uuid";
import { db } from "./db.js";
import { seedQuestions } from "./seedData.js";
import { DOMAINS } from "../domainWeights.js";

const insert = db.prepare(`
  INSERT INTO questions (id, domain, item_type, stem, options, correct_option_ids, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction(() => {
  for (const q of seedQuestions) {
    insert.run(
      uuidv4(),
      q.domain,
      q.itemType,
      q.stem,
      JSON.stringify(q.options),
      JSON.stringify(q.correctOptionIds),
      q.explanation
    );
  }
});
tx();

const counts = db
  .prepare("SELECT domain, COUNT(*) AS count FROM questions GROUP BY domain")
  .all() as { domain: number; count: number }[];
const countByDomain = new Map(counts.map((c) => [c.domain, c.count]));

console.log(`Seeded ${seedQuestions.length} questions.`);
for (const d of DOMAINS) {
  console.log(`  Domain ${d.id} (${d.name}): ${countByDomain.get(d.id) ?? 0}`);
}
