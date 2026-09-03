export type ItemType = "single" | "multi";

export interface QuestionOption {
  id: string;
  text: string;
}

export interface DomainInfo {
  id: number;
  name: string;
  weight: number;
  itemsPerExam: number;
  taskStatements: string[];
}

export interface ExamQuestionView {
  questionId: string;
  domain: number;
  itemType: ItemType;
  stem: string;
  options: QuestionOption[];
  position: number;
  selectedOptionIds: string[];
  flaggedForReview: boolean;
}

export interface ExamView {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  durationMinutes: number;
  questions: ExamQuestionView[];
  bankLow?: boolean;
  examLength?: number;
}

export type AccuracyLevel = "weak" | "borderline" | "strong";

export interface DomainBreakdownEntry {
  domain: number;
  name: string;
  correct: number;
  total: number;
  pct: number;
  level: AccuracyLevel;
}

export interface StudyNextEntry {
  domain: number;
  name: string;
  pct: number;
  pointer: string;
}

export interface ReviewItem {
  questionId: string;
  domain: number;
  itemType: ItemType;
  stem: string;
  options: QuestionOption[];
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
  explanation: string;
}

export interface ScoreTrendPoint {
  attemptId: string;
  submittedAt: string;
  scaledScore: number;
  passed: boolean;
}

export interface DomainTrendPoint {
  attemptId: string;
  submittedAt: string;
  pctByDomain: Record<number, number | null>;
}

export interface WeakestDomainEntry {
  domain: number;
  name: string;
  correct: number;
  total: number;
  pct: number | null;
}

export interface RecentAttempt {
  id: string;
  submittedAt: string;
  rawScore: number;
  scaledScore: number;
  passed: boolean;
}

export interface DashboardData {
  totalAttempts: number;
  scoreTrend: ScoreTrendPoint[];
  domainTrend: DomainTrendPoint[];
  weakestOverall: WeakestDomainEntry[];
  streak: number;
  recent: RecentAttempt[];
}

export interface ResultsView {
  id: string;
  startedAt: string;
  submittedAt: string | null;
  rawScore: number;
  examLength: number;
  scaledScore: number;
  passed: boolean;
  domainBreakdown: DomainBreakdownEntry[];
  studyNext: StudyNextEntry[];
  review: ReviewItem[];
}
