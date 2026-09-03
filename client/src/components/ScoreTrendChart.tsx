import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreTrendPoint } from "../lib/types";
import { PASS_LINE, SERIES_BLUE, STATUS_GOOD, STATUS_CRITICAL, TEXT_MUTED, TEXT_SECONDARY, GRIDLINE } from "../lib/chartTokens";
import { formatDate } from "../lib/format";

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const color = payload.passed ? STATUS_GOOD : STATUS_CRITICAL;
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fcfcfb" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{p.score}</p>
      <p className="text-slate-500">{formatDate(p.submittedAt)}</p>
      <p className={p.passed ? "text-emerald-700" : "text-red-700"}>
        {p.passed ? "Pass" : "Fail"}
      </p>
    </div>
  );
}

export default function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
  const chartData = data.map((d) => ({
    submittedAt: d.submittedAt,
    date: formatDate(d.submittedAt),
    score: d.scaledScore,
    passed: d.passed,
  }));

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STATUS_GOOD }} />
          Pass
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CRITICAL }} />
          Fail
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRIDLINE} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 12 }} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
          <YAxis
            domain={[100, 1000]}
            ticks={[100, 400, 720, 1000]}
            tick={{ fill: TEXT_MUTED, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine
            y={720}
            stroke={PASS_LINE}
            strokeDasharray="4 4"
            label={{ value: "Passing (720)", position: "insideTopRight", fill: TEXT_SECONDARY, fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRIDLINE }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke={SERIES_BLUE}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
