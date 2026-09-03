import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { ExamView } from "../lib/types";
import Timer from "../components/Timer";
import QuestionCard from "../components/QuestionCard";

type View = "loading" | "question" | "summary" | "error";

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamView | null>(null);
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("loading");
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const warnedRef = useRef<{ ten: boolean; two: boolean }>({ ten: false, two: false });
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    api
      .getExam(id)
      .then((data) => {
        setExam(data);
        const startedAtMs = new Date(data.startedAt.replace(" ", "T") + "Z").getTime();
        const deadline = startedAtMs + data.durationMinutes * 60 * 1000;
        setRemainingSeconds(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
        setView("question");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load exam");
        setView("error");
      });
  }, [id]);

  const doSubmit = useCallback(async () => {
    if (!id || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api.submitExam(id);
      navigate(`/results/${id}`);
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Could not submit exam");
    }
  }, [id, navigate]);

  useEffect(() => {
    if (view !== "question" && view !== "summary") return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        const next = s - 1;
        if (next <= 600 && !warnedRef.current.ten) warnedRef.current.ten = true;
        if (next <= 120 && !warnedRef.current.two) warnedRef.current.two = true;
        if (next <= 0) {
          clearInterval(interval);
          doSubmit();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, doSubmit]);

  if (view === "loading") {
    return <p className="text-center mt-16 text-slate-500">Loading exam…</p>;
  }
  if (view === "error" || !exam) {
    return <p className="text-center mt-16 text-red-600">{error ?? "Exam not found"}</p>;
  }

  const current = exam.questions[index];
  const answeredCount = exam.questions.filter((q) => q.selectedOptionIds.length > 0).length;
  const flaggedCount = exam.questions.filter((q) => q.flaggedForReview).length;

  function updateQuestion(questionId: string, patch: Partial<ExamView["questions"][number]>) {
    setExam((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) =>
              q.questionId === questionId ? { ...q, ...patch } : q
            ),
          }
        : prev
    );
  }

  function handleSelect(optionIds: string[]) {
    if (!id) return;
    updateQuestion(current.questionId, { selectedOptionIds: optionIds });
    api.saveAnswer(id, current.questionId, { selectedOptionIds: optionIds }).catch(() => {});
  }

  function handleToggleFlag() {
    if (!id) return;
    const next = !current.flaggedForReview;
    updateQuestion(current.questionId, { flaggedForReview: next });
    api.saveAnswer(id, current.questionId, { flaggedForReview: next }).catch(() => {});
  }

  const showTenWarning = remainingSeconds <= 600 && remainingSeconds > 599;
  const showTwoWarning = remainingSeconds <= 120 && remainingSeconds > 119;

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center justify-between py-4 sticky top-0 bg-slate-50/95 backdrop-blur z-10">
        <h1 className="font-semibold text-slate-800">CCAO-F Practice Exam</h1>
        <div className="flex items-center gap-3">
          {exam.bankLow && (
            <span className="text-xs text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
              Bank running low — some repeats today
            </span>
          )}
          <Timer remainingSeconds={remainingSeconds} />
        </div>
      </div>

      {(showTenWarning || showTwoWarning) && (
        <div className="mb-4 rounded-lg bg-amber-100 text-amber-800 text-sm px-4 py-2">
          {showTwoWarning
            ? "2 minutes remaining — your exam will auto-submit when time runs out."
            : "10 minutes remaining."}
        </div>
      )}

      {/* Question navigator grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-5">
        {exam.questions.map((q, i) => {
          const answered = q.selectedOptionIds.length > 0;
          return (
            <button
              key={q.questionId}
              onClick={() => {
                setIndex(i);
                setView("question");
              }}
              className={`relative h-9 rounded-md text-xs font-medium border ${
                i === index && view === "question"
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-slate-200"
              } ${answered ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500"}`}
            >
              {i + 1}
              {q.flaggedForReview && (
                <span className="absolute -top-1 -right-1 text-amber-500">★</span>
              )}
            </button>
          );
        })}
      </div>

      {view === "question" && (
        <>
          <QuestionCard
            question={current}
            index={index}
            total={exam.questions.length}
            onSelect={handleSelect}
            onToggleFlag={handleToggleFlag}
          />

          <div className="flex items-center justify-between mt-5">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setView("summary")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600"
            >
              Review &amp; submit
            </button>
            {index < exam.questions.length - 1 ? (
              <button
                onClick={() => setIndex((i) => Math.min(exam.questions.length - 1, i + 1))}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setView("summary")}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
              >
                Finish
              </button>
            )}
          </div>
        </>
      )}

      {view === "summary" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 text-lg mb-2">Review before you submit</h2>
          <p className="text-slate-500 text-sm mb-4">
            {answeredCount} of {exam.questions.length} answered · {flaggedCount} flagged for
            review
          </p>
          {answeredCount < exam.questions.length && (
            <p className="text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-sm mb-4">
              You have {exam.questions.length - answeredCount} unanswered question(s). Unanswered
              questions are scored as incorrect.
            </p>
          )}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 mb-6">
            {exam.questions.map((q, i) => {
              const answered = q.selectedOptionIds.length > 0;
              return (
                <button
                  key={q.questionId}
                  onClick={() => {
                    setIndex(i);
                    setView("question");
                  }}
                  className={`relative h-9 rounded-md text-xs font-medium border border-slate-200 ${
                    answered ? "bg-indigo-100 text-indigo-700" : "bg-white text-slate-500"
                  }`}
                >
                  {i + 1}
                  {q.flaggedForReview && (
                    <span className="absolute -top-1 -right-1 text-amber-500">★</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setView("question")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600"
            >
              Back to exam
            </button>
            <button
              onClick={doSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit exam"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
