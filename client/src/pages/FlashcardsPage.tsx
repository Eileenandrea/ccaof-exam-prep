import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useDomains } from "../lib/DomainsContext";
import type { FlashcardItem } from "../lib/types";
import Flashcard from "../components/Flashcard";

export default function FlashcardsPage() {
  const domains = useDomains();
  const [domainFilter, setDomainFilter] = useState<number | "all">("all");
  const [dueOnly, setDueOnly] = useState(false);
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getFlashcards({ domain: domainFilter === "all" ? undefined : domainFilter, due: dueOnly })
      .then((data) => {
        setCards(data);
        setIndex(0);
        setFlipped(false);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load flashcards"))
      .finally(() => setLoading(false));
  }, [domainFilter, dueOnly]);

  async function handleMark(outcome: "easy" | "hard") {
    const card = cards[index];
    if (!card || submitting) return;
    setSubmitting(true);
    try {
      await api.reviewFlashcard(card.questionId, outcome);
    } catch {
      // best-effort; still advance so the session isn't blocked by a transient error
    }
    setSubmitting(false);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Flashcards</h1>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
        >
          <option value="all">All domains</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
          Due for review only
        </label>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && cards.length === 0 && (
        <p className="text-slate-500 bg-white rounded-xl border border-slate-200 p-8 text-center">
          No flashcards match this filter.
        </p>
      )}

      {!loading && !error && cards.length > 0 && index >= cards.length && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <p className="text-slate-700 font-medium mb-1">You've reviewed all {cards.length} cards.</p>
          <p className="text-slate-500 text-sm mb-4">Change the filter or start again.</p>
          <button
            onClick={() => {
              setIndex(0);
              setFlipped(false);
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
          >
            Start over
          </button>
        </div>
      )}

      {!loading && !error && cards.length > 0 && index < cards.length && (
        <>
          <p className="text-sm text-slate-400 mb-2">
            Card {index + 1} of {cards.length}
          </p>
          <Flashcard card={cards[index]} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />

          <div className="flex items-center justify-center gap-3 mt-5">
            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium"
              >
                Show answer
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleMark("hard")}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg border border-red-300 text-red-700 font-medium disabled:opacity-60"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleMark("easy")}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg border border-emerald-300 text-emerald-700 font-medium disabled:opacity-60"
                >
                  Easy
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
