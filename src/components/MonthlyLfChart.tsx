import type { MonthlySeries } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";

type Props = {
  series: MonthlySeries[];
  title?: string;
};

/**
 * Lightweight stacked bar chart (SVG) - no chart library dependency.
 * Bars show Install / Drop, Pickup, and Other LF per month.
 */
export function MonthlyLfChart({ series, title = "Monthly LF by job type group" }: Props) {
  const width = 640;
  const height = 220;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(1, ...series.map((s) => s.totalLf));
  const barGap = 8;
  const barW = Math.max(8, plotW / series.length - barGap);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <ul className="flex flex-wrap gap-3 text-xs text-slate-600">
          <Legend color="#2563eb" label="Install / Drop" />
          <Legend color="#16a34a" label="Pickup" />
          <Legend color="#94a3b8" label="Other" />
        </ul>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[320px]"
          role="img"
          aria-label={title}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + plotH * (1 - t);
            const val = Math.round(max * t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400"
                  fontSize={10}
                >
                  {formatNumber(val, 0)}
                </text>
              </g>
            );
          })}
          {series.map((s, i) => {
            const x = padL + i * (plotW / series.length) + barGap / 2;
            const hInst = (s.instLf / max) * plotH;
            const hPu = (s.puLf / max) * plotH;
            const hOther = (s.otherLf / max) * plotH;
            let y = padT + plotH;
            const parts: Array<{ h: number; color: string; key: string }> = [
              { h: hInst, color: "#2563eb", key: "inst" },
              { h: hPu, color: "#16a34a", key: "pu" },
              { h: hOther, color: "#94a3b8", key: "other" },
            ];
            return (
              <g key={s.month}>
                {parts.map((p) => {
                  if (p.h <= 0) return null;
                  y -= p.h;
                  const rectY = y;
                  return (
                    <rect
                      key={p.key}
                      x={x}
                      y={rectY}
                      width={barW}
                      height={p.h}
                      fill={p.color}
                      rx={1}
                    >
                      <title>
                        {s.label}: {formatNumber(s.totalLf, 0)} LF (Install/Drop{" "}
                        {formatNumber(s.instLf, 0)}, Pickup {formatNumber(s.puLf, 0)})
                      </title>
                    </rect>
                  );
                })}
                <text
                  x={x + barW / 2}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-slate-500"
                  fontSize={10}
                >
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {!series.some((s) => s.totalLf > 0) && (
        <p className="mt-2 text-sm text-slate-500">No LF in the selected filters.</p>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </li>
  );
}
