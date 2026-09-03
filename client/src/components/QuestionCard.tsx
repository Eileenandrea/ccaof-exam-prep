import DomainBadge from "./DomainBadge";
import type { ExamQuestionView } from "../lib/types";

interface Props {
  question: ExamQuestionView;
  index: number;
  total: number;
  onSelect: (optionIds: string[]) => void;
  onToggleFlag: () => void;
}

export default function QuestionCard({ question, index, total, onSelect, onToggleFlag }: Props) {
  const isMulti = question.itemType === "multi";

  function toggleOption(optionId: string) {
    if (isMulti) {
      const has = question.selectedOptionIds.includes(optionId);
      const next = has
        ? question.selectedOptionIds.filter((id) => id !== optionId)
        : [...question.selectedOptionIds, optionId];
      onSelect(next);
    } else {
      onSelect([optionId]);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-medium">
            Question {index + 1} of {total}
          </span>
          <DomainBadge domain={question.domain} />
          {isMulti && (
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">
              Select all that apply
            </span>
          )}
        </div>
        <button
          onClick={onToggleFlag}
          className={`text-xs font-medium rounded-full px-3 py-1 border ${
            question.flaggedForReview
              ? "bg-amber-100 border-amber-300 text-amber-700"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {question.flaggedForReview ? "★ Flagged" : "☆ Flag for review"}
        </button>
      </div>

      <p className="text-slate-800 text-base leading-relaxed mb-5 whitespace-pre-wrap">
        {question.stem}
      </p>

      <div className="space-y-2">
        {question.options.map((opt) => {
          const selected = question.selectedOptionIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                selected
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type={isMulti ? "checkbox" : "radio"}
                name={`q-${question.questionId}`}
                checked={selected}
                onChange={() => toggleOption(opt.id)}
                className="mt-1"
              />
              <span className="text-slate-700 text-sm">{opt.text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
