"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact, fmtNumber } from "@/lib/helpers";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

type Series = { key: string; label: string; color?: string };

/** Time-series area chart — ActivityChart in spec §57. */
export function ActivityChart({ data, series, xKey = "label", height = 260, percent }: { data: Record<string, unknown>[]; series: Series[]; xKey?: string; height?: number; percent?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} {...axis} minTickGap={24} />
        <YAxis {...axis} tickFormatter={(v) => (percent ? `${v}%` : fmtCompact(Number(v)))} width={48} />
        <Tooltip {...tooltipStyle} formatter={(v) => (percent ? `${v}%` : fmtNumber(Number(v)))} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? CHART_COLORS[i]} strokeWidth={2} fill={`url(#grad-${s.key})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Categorical comparison — UsageChart in spec §57. */
export function UsageChart({ data, series, xKey = "label", height = 260, layout = "horizontal", stacked, percent }: { data: Record<string, unknown>[]; series: Series[]; xKey?: string; height?: number; layout?: "horizontal" | "vertical"; stacked?: boolean; percent?: boolean }) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 8, right: 8, left: vertical ? 8 : -12, bottom: 0 }}>
        <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--border)" />
        {vertical ? (
          <>
            <XAxis type="number" {...axis} tickFormatter={(v) => (percent ? `${v}%` : fmtCompact(Number(v)))} />
            <YAxis type="category" dataKey={xKey} {...axis} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...axis} interval={0} tick={{ fontSize: 11 }} />
            <YAxis {...axis} tickFormatter={(v) => (percent ? `${v}%` : fmtCompact(Number(v)))} width={48} />
          </>
        )}
        <Tooltip {...tooltipStyle} formatter={(v) => (percent ? `${Number(v).toFixed(1)}%` : fmtNumber(Number(v)))} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? CHART_COLORS[i]} radius={stacked ? 0 : [4, 4, 0, 0]} stackId={stacked ? "a" : undefined} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, series, xKey = "label", height = 220, percent }: { data: Record<string, unknown>[]; series: Series[]; xKey?: string; height?: number; percent?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} width={48} tickFormatter={(v) => (percent ? `${v}%` : fmtCompact(Number(v)))} domain={percent ? [0, 100] : undefined} />
        <Tooltip {...tooltipStyle} formatter={(v) => (percent ? `${Number(v).toFixed(1)}%` : fmtNumber(Number(v)))} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? CHART_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Part-to-whole with ≤5 slices; rendered as a donut with the total in the centre. */
export function DonutChart({ data, height = 220, centerLabel }: { data: { name: string; value: number; color?: string }[]; height?: number; centerLabel?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => `${fmtNumber(Number(v))} (${total ? ((Number(v) / total) * 100).toFixed(0) : 0}%)`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums">{fmtNumber(total)}</span>
        {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; value?: React.ReactNode }[] }) {
  return (
    <ul className="grid gap-1.5 text-sm">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: it.color }} />
          <span className="flex-1 text-muted-foreground">{it.label}</span>
          {it.value !== undefined && <span className="font-medium tabular-nums">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
