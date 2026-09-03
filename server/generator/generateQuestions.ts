// Offline batch script that grows the question bank toward QUESTION_BANK_TARGET
// via the Claude API. Never called during exam-taking — exam selection always
// reads from the already-generated bank in SQLite (per architecture.md).
//
// Usage:
//   npm run generate                       # top up every domain below target, up to 10 each
//   npm run generate -- --domain 2         # top up only domain 2
//   npm run generate -- --domain 2 --count 20
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/db.js";
import { DOMAINS, QUESTION_BANK_TARGET } from "../domainWeights.js";
import type { ItemType } from "../types.js";

interface GeneratedQuestion {
  itemType: ItemType;
  stem: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation: string;
}

// output_config.format doesn't support numerical constraints (minItems, etc.)
// per the structured-outputs schema limitations, so item/option counts are
// enforced by isValid() below rather than in the schema itself.
const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemType: { type: "string", enum: ["single", "multi"] },
          stem: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
              },
              required: ["id", "text"],
              additionalProperties: false,
            },
          },
          correctOptionIds: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
        },
        required: ["itemType", "stem", "options", "correctOptionIds", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
} as const;

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { domain?: number; count: number } = { count: 10 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--domain") opts.domain = Number(args[++i]);
    if (args[i] === "--count") opts.count = Number(args[++i]);
  }
  return opts;
}

function buildPrompt(
  domainName: string,
  taskStatements: string[],
  count: number,
  existingStems: string[]
): string {
  return `You are writing original practice exam questions for the CCAO-F (Claude Certified Associate - Foundations) exam prep app. These are NOT real or leaked Anthropic exam questions — they are original questions written to the public exam blueprint.

Write ${count} new multiple-choice questions for the domain "${domainName}".

This domain covers these task statements:
${taskStatements.map((t) => `- ${t}`).join("\n")}

Requirements:
- Scenario-based: ground every question in a realistic workplace situation (marketing, ops, PM, education, communications, or general knowledge work). Avoid pure recall ("What is X?") — prefer "You are doing X, Claude does Y, what should you do?"
- Mix item types: mostly "single" (4 options, exactly one correct), with roughly 1 in 5 as "multi" (4 options, exactly 2-3 correct) — set itemType and correctOptionIds accordingly.
- Distractors must be plausible: each wrong option should represent a common misconception, not an obviously silly choice.
- Every question needs a clear, specific explanation of why the correct answer(s) are correct.
- Option ids must be "a", "b", "c", "d" in that order.
- Do not duplicate or closely rephrase any of these existing questions in this domain:
${existingStems.length > 0 ? existingStems.map((s) => `- ${s}`).join("\n") : "(none yet)"}`;
}

async function generateForDomain(
  client: Anthropic,
  domainId: number,
  count: number
): Promise<GeneratedQuestion[]> {
  const domain = DOMAINS.find((d) => d.id === domainId);
  if (!domain) throw new Error(`Unknown domain ${domainId}`);

  const existingStems = (
    db.prepare("SELECT stem FROM questions WHERE domain = ?").all(domainId) as { stem: string }[]
  )
    .map((r) => r.stem)
    .slice(-30);

  const prompt = buildPrompt(domain.name, domain.taskStatements, count, existingStems);

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: QUESTION_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error(`Model declined to generate questions for domain ${domainId}`);
  }
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text content returned for domain ${domainId}`);
  }

  const parsed = JSON.parse(textBlock.text) as { questions: GeneratedQuestion[] };
  return parsed.questions ?? [];
}

function isValid(q: GeneratedQuestion): string | null {
  if (q.itemType !== "single" && q.itemType !== "multi") return "invalid itemType";
  if (!q.stem || q.stem.trim().length < 20) return "stem too short";
  if (!Array.isArray(q.options) || q.options.length !== 4) return "must have exactly 4 options";
  const ids = q.options.map((o) => o.id);
  if (new Set(ids).size !== 4) return "duplicate option ids";
  if (!q.options.every((o) => o.text && o.text.trim().length > 0)) return "empty option text";
  if (!Array.isArray(q.correctOptionIds) || q.correctOptionIds.length === 0)
    return "no correct answer given";
  if (!q.correctOptionIds.every((id) => ids.includes(id)))
    return "correctOptionIds reference an option that doesn't exist";
  if (q.itemType === "single" && q.correctOptionIds.length !== 1)
    return "single-select item must have exactly 1 correct answer";
  if (q.itemType === "multi" && q.correctOptionIds.length < 2)
    return "multi-select item must have 2+ correct answers";
  if (!q.explanation || q.explanation.trim().length < 20) return "explanation too short/missing";
  return null;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Set it in your environment (or a .env file) before running the generator."
    );
    process.exit(1);
  }
  const client = new Anthropic({ apiKey });

  const opts = parseArgs();
  const targetDomains = opts.domain ? DOMAINS.filter((d) => d.id === opts.domain) : DOMAINS;
  if (opts.domain && targetDomains.length === 0) {
    console.error(`Unknown domain id: ${opts.domain}`);
    process.exit(1);
  }

  const insert = db.prepare(`
    INSERT INTO questions (id, domain, item_type, stem, options, correct_option_ids, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const domain of targetDomains) {
    const currentCount = (
      db.prepare("SELECT COUNT(*) AS c FROM questions WHERE domain = ?").get(domain.id) as {
        c: number;
      }
    ).c;
    const target = Math.round(QUESTION_BANK_TARGET * domain.weight);
    const needed = Math.max(0, target - currentCount);
    const batchSize = opts.domain ? opts.count : Math.min(opts.count, needed || opts.count);

    if (!opts.domain && needed === 0) {
      console.log(
        `Domain ${domain.id} (${domain.name}) already at/above target (${currentCount}/${target}). Skipping.`
      );
      continue;
    }

    console.log(`Generating ${batchSize} questions for domain ${domain.id} (${domain.name})...`);
    let generated: GeneratedQuestion[];
    try {
      generated = await generateForDomain(client, domain.id, batchSize);
    } catch (e) {
      console.error(`  Generation failed for domain ${domain.id}:`, e instanceof Error ? e.message : e);
      continue;
    }

    const tx = db.transaction(() => {
      for (const q of generated) {
        const reason = isValid(q);
        if (reason) {
          console.warn(`  Skipped invalid question: ${reason}`);
          totalSkipped++;
          continue;
        }
        insert.run(
          uuidv4(),
          domain.id,
          q.itemType,
          q.stem,
          JSON.stringify(q.options),
          JSON.stringify(q.correctOptionIds),
          q.explanation
        );
        totalInserted++;
      }
    });
    tx();
  }

  console.log(`\nDone. Inserted ${totalInserted} questions, skipped ${totalSkipped} invalid.`);
}

main().catch((e) => {
  console.error("Generator failed:", e);
  process.exit(1);
});
