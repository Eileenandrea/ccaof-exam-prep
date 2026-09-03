import type { DashboardData, DomainInfo, ExamView, ResultsView } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getDomains: () => request<DomainInfo[]>("/domains"),

  startExam: () =>
    request<ExamView & { bankLow: boolean; examLength: number }>("/exams", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getExam: (id: string) => request<ExamView>(`/exams/${id}`),

  saveAnswer: (
    examId: string,
    questionId: string,
    payload: { selectedOptionIds?: string[]; flaggedForReview?: boolean }
  ) =>
    request<{ ok: true }>(`/exams/${examId}/items/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  submitExam: (examId: string) =>
    request<ResultsView>(`/exams/${examId}/submit`, { method: "POST" }),

  getAttemptResults: (attemptId: string) =>
    request<ResultsView>(`/attempts/${attemptId}`),

  getDashboard: () => request<DashboardData>("/dashboard"),
};
