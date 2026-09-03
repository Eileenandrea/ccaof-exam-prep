import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function HomePage() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const exam = await api.startExam();
      navigate(`/exam/${exam.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start exam");
      setStarting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <h1 className="text-3xl font-bold text-slate-800">CCAO-F Exam Prep</h1>
      <p className="mt-3 text-slate-500">
        A self-study tool for the Claude Certified Associate – Foundations exam. 60 questions,
        120 minutes, scored against a 720/1000 approximate passing bar.
      </p>
      <button
        onClick={handleStart}
        disabled={starting}
        className="mt-8 rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
      >
        {starting ? "Starting…" : "Start a new exam"}
      </button>
      {error && <p className="mt-4 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
