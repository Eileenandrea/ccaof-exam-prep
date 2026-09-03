import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { ResultsView } from "../lib/types";
import ItemReviewRow from "../components/ItemReviewRow";

const LEVEL_STYLES: Record<string, { bar: string; text: string; label: string }> = {
  weak: { bar: "bg-red-500", text: "text-red-700", label: "Weak" },
  borderline: { bar: "bg-amber-500", text: "text-amber-700", label: "Borderline" },
  strong: { bar: "bg-emerald-500", text: "text-emerald-700", label: "Strong" },
};

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<ResultsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getAttemptResults(id)
      .then(setResults)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load results"));
  }, [id]);

  const visibleReview = useMemo(() => {
    if (!results) return [];
    return showAll ? results.review : results.review.filter((r) => !r.isCorrect);
  }, [results, showAll]);

  if (error) return <p className="text-center mt-16 text-red-600">{error}</p>;
  if (!results) return <p className="text-center mt-16 text-slate-500">Loading results…</p>;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Headline */}
      <div className="text-center mb-10">
        <p
          className={`inline-block rounded-full px-4 py-1 text-sm font-semibold mb-4 ${
            results.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {results.passed ? "PASS" : "NOT YET PASSING"}
        </p>
        <h1 className="text-5xl font-bold text-slate-800">{results.scaledScore}</h1>
        <p className="text-slate-500 mt-1">
          Scaled score (approximate, 100-1000; 720 to pass — not Pearson's real algorithm)
        </p>
        <p className="mt-4 text-slate-600">
          Raw score: {results.rawScore} / {results.examLength}
        </p>
      </div>

      {/* Per-domain breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-4">Per-domain accuracy</h2>
        <div className="space-y-3">
          {results.domainBreakdown.map((d) => {
            const style = LEVEL_STYLES[d.level];
            const pct = Math.round(d.pct * 100);
            return (
              <div key={d.domain}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{d.name}</span>
                  <span className={`font-medium ${style.text}`}>
                    {pct}% ({d.correct}/{d.total}) · {style.label}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* What to study next */}
      {results.studyNext.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-indigo-900 mb-3">What to study next</h2>
          <ul className="space-y-2">
            {results.studyNext.map((s) => (
              <li key={s.domain} className="text-sm text-indigo-900">
                <span className="font-medium">
                  {s.name} ({Math.round(s.pct * 100)}%)
                </span>
                <span className="text-indigo-700"> — {s.pointer}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Item-by-item review */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">Item review</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show correct answers too
        </label>
      </div>
      {visibleReview.length === 0 ? (
        <p className="text-slate-500 text-sm mb-8">
          {showAll ? "No questions." : "No incorrect answers — nice work!"}
        </p>
      ) : (
        <div className="space-y-4 mb-8">
          {visibleReview.map((item) => {
            const originalIndex = results.review.findIndex((r) => r.questionId === item.questionId);
            return <ItemReviewRow key={item.questionId} item={item} index={originalIndex} />;
          })}
        </div>
      )}

      <div className="text-center">
        <Link
          to="/"
          className="inline-block px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
