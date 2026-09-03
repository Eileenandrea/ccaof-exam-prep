function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = h > 0 ? [h, m, sec] : [m, sec];
  return parts.map((p) => String(p).padStart(2, "0")).join(":");
}

export default function Timer({ remainingSeconds }: { remainingSeconds: number }) {
  const low = remainingSeconds <= 120;
  const warn = remainingSeconds <= 600;
  return (
    <div
      className={`font-mono text-lg font-semibold px-3 py-1 rounded-lg ${
        low
          ? "bg-red-100 text-red-700"
          : warn
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {formatTime(remainingSeconds)}
    </div>
  );
}
