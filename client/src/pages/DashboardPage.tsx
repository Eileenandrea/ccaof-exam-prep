import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { DashboardData } from "../lib/types";
import { formatDateTime } from "../lib/format";
import StatTile from "../components/StatTile";
import ScoreTrendChart from "../components/ScoreTrendChart";
import DomainTrendGrid from "../components/DomainTrendGrid";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboard"));
  }, []);

  if (error) return <p className="text-center mt-16 text-red-600">{error}</p>;
  if (!data) return <p className="text-center mt-16 text-slate-500">Loading dashboard…</p>;

  if (data.totalAttempts === 0) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">No attempts yet</h1>
        <p className="mt-3 text-slate-500">
          Take your first practice exam and your score trend, per-domain progress, and streak
          will show up here.
        </p>
        <Link
          to="/"
          className="inline-block mt-8 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium"
        >
          Start an exam
        </Link>
      </div>
    );
  }

  const latest = data.recent[0];
  const weakest = data.weakestOverall.find((d) => d.total > 0);

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="Attempts" value={String(data.totalAttempts)} />
        <StatTile
          label="Latest score"
          value={latest ? String(latest.scaledScore) : "—"}
          sublabel={latest ? (latest.passed ? "Pass" : "Not yet passing") : undefined}
        />
        <StatTile label="Current streak" value={`${data.streak} day${data.streak === 1 ? "" : "s"}`} />
        <StatTile
          label="Weakest domain"
          value={weakest ? `${Math.round((weakest.pct ?? 0) * 100)}%` : "—"}
          sublabel={weakest?.name}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-4">Score trend</h2>
        <ScoreTrendChart data={data.scoreTrend} />
      </div>

      <div className="mb-8">
        <h2 className="font-semibold text-slate-800 mb-4">Per-domain accuracy trend</h2>
        <DomainTrendGrid data={data.domainTrend} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Recent attempts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="font-medium py-2 pr-4">Date</th>
                <th className="font-medium py-2 pr-4">Raw score</th>
                <th className="font-medium py-2 pr-4">Scaled score</th>
                <th className="font-medium py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 text-slate-600">{formatDateTime(a.submittedAt)}</td>
                  <td className="py-2 pr-4 text-slate-600 tabular-nums">{a.rawScore} / 60</td>
                  <td className="py-2 pr-4 text-slate-800 font-medium tabular-nums">{a.scaledScore}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                        a.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.passed ? "Pass" : "Fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
