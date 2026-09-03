// Single source of truth for the CCAO-F exam blueprint.
// Mirrors the table in CLAUDE.md — if the blueprint changes, update ONLY here.
// The client fetches this via GET /api/domains instead of duplicating it.

export interface DomainInfo {
  id: number;
  name: string;
  weight: number; // fraction of a 60-question exam
  itemsPerExam: number; // rounded target item count per 60-Q exam
  taskStatements: string[];
}

export const DOMAINS: DomainInfo[] = [
  {
    id: 1,
    name: "Prompting and Task Execution",
    weight: 0.14,
    itemsPerExam: 8,
    taskStatements: [
      "Create effective prompts for business/technical tasks",
      "Apply task decomposition to complex requests",
      "Iterate prompts to improve output quality",
      "Adapt prompting strategy to task type (analysis, research, drafting, brainstorming)",
    ],
  },
  {
    id: 2,
    name: "Output Evaluation and Validation",
    weight: 0.21,
    itemsPerExam: 13,
    taskStatements: [
      "Evaluate outputs for accuracy and completeness",
      "Identify hallucinations, inconsistencies, and bias",
      "Apply fact-checking and validation techniques",
      "Decide when human review is required",
      "Edit, adapt, refine, and compare outputs for audience",
      "Curate information and pick the right output format (artifacts, inline, structured data)",
    ],
  },
  {
    id: 3,
    name: "Product and Model Selection",
    weight: 0.12,
    itemsPerExam: 7,
    taskStatements: [
      "Select the right product feature (Projects, research mode, chat, artifacts)",
      "Differentiate model types (Haiku/Sonnet/Opus) by cost, speed, and quality",
      "Manage context limits (restart, summarize, persist)",
    ],
  },
  {
    id: 4,
    name: "Workflow Integration and Solution Design",
    weight: 0.16,
    itemsPerExam: 10,
    taskStatements: [
      "Use Claude for requirements analysis and use case discovery",
      "Support research, planning, and process optimization",
      "Design, develop, and iterate on solutions",
      "Integrate Claude into existing workflows",
      "Communicate Claude's value and limitations to stakeholders",
    ],
  },
  {
    id: 5,
    name: "Configuration and Knowledge Management",
    weight: 0.12,
    itemsPerExam: 7,
    taskStatements: [
      "Configure Projects with instructions and knowledge sources",
      "Manage uploaded knowledge and connectors (Google Drive, Gmail, etc.)",
      "Write system-level instructions",
      "Maintain and update configs/knowledge over time (conflicting, missing, outdated info)",
    ],
  },
  {
    id: 6,
    name: "Governance, Risk, and Responsible Use",
    weight: 0.15,
    itemsPerExam: 9,
    taskStatements: [
      "Identify appropriate vs. inappropriate use cases",
      "Apply data sensitivity, regulatory, and privacy considerations",
      "Follow organizational AI policy and governance",
      "Understand ethical implications of AI use",
    ],
  },
  {
    id: 7,
    name: "Troubleshooting and Optimisation",
    weight: 0.10,
    itemsPerExam: 6,
    taskStatements: [
      "Diagnose why a prompt or output is underperforming",
      "Adjust approach based on feedback and results",
      "Optimize workflows for efficiency",
    ],
  },
];

export const EXAM_LENGTH = 60;
export const PASS_THRESHOLD = 720;
export const SCALED_MIN = 100;
export const SCALED_MAX = 1000;
export const DEFAULT_EXCLUDE_DAYS = 7;
export const QUESTION_BANK_TARGET = 1000;

export function domainName(id: number): string {
  return DOMAINS.find((d) => d.id === id)?.name ?? `Domain ${id}`;
}
