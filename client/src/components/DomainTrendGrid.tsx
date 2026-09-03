import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { useDomains } from "../lib/DomainsContext";
import type { DomainTrendPoint } from "../lib/types";
import { GRIDLINE, SERIES_BLUE, TEXT_MUTED, TEXT_SECONDARY } from "../lib/chartTokens";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-2.5 py-1.5 text-xs">
      <span className="font-semibold text-slate-800">{Math.round(v)}%</span>
    </div>
  );
}

// Seven domains sits at the series-count "token ceiling" — rather than one
// 7-line spaghetti chart, facet into small multiples (one mini single-hue
// line per domain) so no legend/color-matching is required to read it.
export default function DomainTrendGrid({ data }: { data: DomainTrendPoint[] }) {
  const domains = useDomains();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {domains.map((domain) => {
        const series = data
          .map((d) => {
            const pct = d.pctByDomain[domain.id];
            return pct == null ? null : { submittedAt: d.submittedAt, pct: Math.round(pct * 1000) / 10 };
          })
          .filter((x): x is { submittedAt: string; pct: number } => x !== null);

        const latest = series.length > 0 ? series[series.length - 1].pct : null;

        return (
          <div key={domain.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-slate-700 leading-tight pr-2">{domain.name}</p>
              {latest !== null && (
                <span className="text-sm font-semibold text-slate-600 shrink-0">{latest}%</span>
              )}
            </div>
            {series.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No attempts yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <YAxis domain={[0, 100]} hide />
                  <ReferenceLine y={60} stroke={GRIDLINE} strokeDasharray="3 3" />
                  <ReferenceLine y={80} stroke={GRIDLINE} strokeDasharray="3 3" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke={SERIES_BLUE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: SERIES_BLUE, stroke: "#fcfcfb", strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              <span style={{ color: TEXT_SECONDARY }}>60%</span> / <span style={{ color: TEXT_MUTED }}>80%</span>{" "}
              reference lines
            </p>
          </div>
        );
      })}
    </div>
  );
}
