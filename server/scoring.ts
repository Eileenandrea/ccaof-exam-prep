import { PASS_THRESHOLD, SCALED_MIN, SCALED_MAX, EXAM_LENGTH } from "./domainWeights.js";

// Linear approximation of a 100-1000 scaled score from raw %.
// This is NOT Pearson's real scaled-scoring algorithm (not public) — explicitly
// labeled as an approximation in the UI per CLAUDE.md.
export function scaledScore(rawScore: number, examLength: number = EXAM_LENGTH): number {
  const pct = rawScore / examLength;
  const scaled = Math.round(SCALED_MIN + pct * (SCALED_MAX - SCALED_MIN));
  return Math.max(SCALED_MIN, Math.min(SCALED_MAX, scaled));
}

export function isPassing(scaled: number): boolean {
  return scaled >= PASS_THRESHOLD;
}

export type DomainAccuracyLevel = "weak" | "borderline" | "strong";

export function accuracyLevel(pct: number): DomainAccuracyLevel {
  if (pct < 0.6) return "weak";
  if (pct < 0.8) return "borderline";
  return "strong";
}
