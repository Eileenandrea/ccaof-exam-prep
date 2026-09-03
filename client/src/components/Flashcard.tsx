import DomainBadge from "./DomainBadge";
import type { FlashcardItem } from "../lib/types";

interface Props {
  card: FlashcardItem;
  flipped: boolean;
  onFlip: () => void;
}

export default function Flashcard({ card, flipped, onFlip }: Props) {
  const correctText = card.correctOptionIds
    .map((id) => card.options.find((o) => o.id === id)?.text ?? id)
    .join("; ");

  return (
    <button
      onClick={onFlip}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-8 min-h-[280px] flex flex-col hover:border-slate-300 transition"
    >
      <div className="flex items-center justify-between mb-4">
        <DomainBadge domain={card.domain} />
        <span className="text-xs text-slate-400">{flipped ? "Answer" : "Question"} · click to flip</span>
      </div>

      {!flipped ? (
        <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap flex-1">
          {card.stem}
        </p>
      ) : (
        <div className="flex-1 space-y-3">
          <p className="text-emerald-700 font-medium">{correctText}</p>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {card.explanation}
          </p>
        </div>
      )}
    </button>
  );
}
