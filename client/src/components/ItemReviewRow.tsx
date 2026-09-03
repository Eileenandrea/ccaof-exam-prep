import DomainBadge from "./DomainBadge";
import type { ReviewItem } from "../lib/types";

export default function ItemReviewRow({ item, index }: { item: ReviewItem; index: number }) {
  const optionText = (id: string) => item.options.find((o) => o.id === id)?.text ?? id;

  return (
    <div
      className={`rounded-xl border p-5 ${
        item.isCorrect ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-slate-400 font-medium">Q{index + 1}</span>
        <DomainBadge domain={item.domain} />
        <span
          className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
            item.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {item.isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      <p className="text-slate-800 mb-3 whitespace-pre-wrap">{item.stem}</p>

      <div className="text-sm space-y-1 mb-3">
        <p>
          <span className="font-medium text-slate-600">Your answer: </span>
          <span className={item.isCorrect ? "text-emerald-700" : "text-red-700"}>
            {item.selectedOptionIds.length > 0
              ? item.selectedOptionIds.map(optionText).join("; ")
              : "(no answer)"}
          </span>
        </p>
        {!item.isCorrect && (
          <p>
            <span className="font-medium text-slate-600">Correct answer: </span>
            <span className="text-emerald-700">
              {item.correctOptionIds.map(optionText).join("; ")}
            </span>
          </p>
        )}
      </div>

      <div className="text-sm bg-white/70 rounded-lg p-3 border border-slate-200">
        <span className="font-medium text-slate-600">Explanation: </span>
        <span className="text-slate-600">{item.explanation}</span>
      </div>
    </div>
  );
}
