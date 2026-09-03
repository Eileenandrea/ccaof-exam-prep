export type ItemType = "single" | "multi";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionRow {
  id: string;
  domain: number;
  item_type: ItemType;
  stem: string;
  options: string; // JSON QuestionOption[]
  correct_option_ids: string; // JSON string[]
  explanation: string;
  difficulty: string | null;
  times_shown: number;
  times_correct: number;
  created_at: string;
}

export interface Question {
  id: string;
  domain: number;
  itemType: ItemType;
  stem: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string;
  difficulty: string | null;
  timesShown: number;
  timesCorrect: number;
  createdAt: string;
}

export function questionFromRow(row: QuestionRow): Question {
  return {
    id: row.id,
    domain: row.domain,
    itemType: row.item_type,
    stem: row.stem,
    options: JSON.parse(row.options),
    correctOptionIds: JSON.parse(row.correct_option_ids),
    explanation: row.explanation,
    difficulty: row.difficulty,
    timesShown: row.times_shown,
    timesCorrect: row.times_correct,
    createdAt: row.created_at,
  };
}

export interface AttemptItemRow {
  attempt_id: string;
  question_id: string;
  position: number;
  selected_option_ids: string | null;
  flagged_for_review: number;
  is_correct: number | null;
}

export interface FlashcardStateRow {
  question_id: string;
  last_reviewed_at: string | null;
  times_reviewed: number;
  times_marked_hard: number;
}

export interface AttemptRow {
  id: string;
  started_at: string;
  submitted_at: string | null;
  raw_score: number | null;
  scaled_score: number | null;
  passed: number | null;
  domain_breakdown: string | null;
}
