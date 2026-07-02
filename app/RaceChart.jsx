"use client";

import { useState } from "react";

const PALETTE = [
  "#58a6ff", "#3fb950", "#f85149", "#d4a017", "#bc8cff", "#39c5cf",
  "#ff7b72", "#7ee787", "#ffa657", "#79c0ff", "#d2a8ff", "#56d364",
  "#e3b341", "#f778ba",
];

function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// series: [{ member, symbol, points: [{ date, pct }] }], sorted best-first.
export default function RaceChart({ series }) {
  const [focus, setFocus] = useState(null);

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  if (dates.length < 2) return null;

  const xIndex = Object.fromEntries(dates.map((d, i) => [d, i]));
  const W = 820;
  const H = 300;
  const L = 46;
  const R = 120;
  const T = 12;
  const B = 28;

  let min = 0;
  let max = 0;
  for (const s of series) {
    for (const p of s.points) {
      if (p.pct < min) min = p.pct;
      if (p.pct > max) max = p.pct;
    }
  }
  const padY = (max - min || 1) * 0.1;
  min -= padY;
  max += padY;

  const X = (d) => L + (xIndex[d] * (W - L - R)) / (dates.length - 1);
  const Y = (v) => T + ((max - v) * (H - T - B)) / (max - min);

  const lines = series.map((s, i) => ({
    ...s,
    color: PALETTE[i % PALETTE.length],
    top3: i < 3,
    path: s.points.map((p, j) => `${j ? "L" : "M"}${X(p.date).toFixed(1)},${Y(p.pct).toFixed(1)}`).join(""),
    last: s.points[s.points.length - 1],
  }));

  return (
    <div className="race">
      <h2>📈 Season Race</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="race-svg" role="img" aria-label="Percent gain per member over the season">
        {/* zero line and bounds */}
        <line x1={L} y1={Y(0)} x2={W - R} y2={Y(0)} stroke="var(--border)" strokeDasharray="4 4" />
        <text x={L - 6} y={Y(0) + 4} className="race-axis" textAnchor="end">0%</text>
        <text x={L - 6} y={T + 10} className="race-axis" textAnchor="end">{max.toFixed(1)}%</text>
        <text x={L - 6} y={H - B - 2} className="race-axis" textAnchor="end">{min.toFixed(1)}%</text>
        <text x={L} y={H - 8} className="race-axis">{fmtDate(dates[0])}</text>
        <text x={W - R} y={H - 8} className="race-axis" textAnchor="end">{fmtDate(dates[dates.length - 1])}</text>

        {lines.map((s) => {
          const focused = focus === s.member;
          const emphasized = focus ? focused : s.top3;
          return (
            <g key={s.member} opacity={focus && !focused ? 0.12 : emphasized ? 1 : 0.3}>
              <path d={s.path} fill="none" stroke={s.color} strokeWidth={emphasized ? 2.2 : 1.2} />
              {emphasized && (
                <text
                  x={X(s.last.date) + 6}
                  y={Y(s.last.pct) + 4}
                  className="race-label"
                  fill={s.color}
                >
                  {s.member} {s.last.pct >= 0 ? "+" : ""}{s.last.pct.toFixed(1)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="race-legend">
        {lines.map((s) => (
          <button
            key={s.member}
            type="button"
            className={`race-chip${focus === s.member ? " active" : ""}`}
            style={{ "--chip": s.color }}
            onClick={() => setFocus(focus === s.member ? null : s.member)}
          >
            {s.member}
          </button>
        ))}
      </div>
      <p className="race-hint">Top 3 highlighted — tap a name to spotlight anyone.</p>
    </div>
  );
}
