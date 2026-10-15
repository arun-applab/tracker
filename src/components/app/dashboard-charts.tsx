"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/constants";

const AXIS = { fontSize: 12, fill: "#64748b" };

function ChartTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload: { label: string; value: number; sub?: string } }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">{d.label}</p>
      <p className="tabular text-muted-foreground">
        {d.value}
        {unit}
        {d.sub ? ` · ${d.sub}` : ""}
      </p>
    </div>
  );
}

/** Horizontal bars, one per status. Status names on the axis + value labels, so color is never the only cue. */
export function StatusBarChart({ data }: { data: { status: ProjectStatus; count: number }[] }) {
  const rows = data.map((d) => ({ label: PROJECT_STATUS[d.status].label, value: d.count, color: PROJECT_STATUS[d.status].hex }));
  return (
    <div className="h-64 w-full" role="img" aria-label={`Projects by status: ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="0" />
          <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={104} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} content={<ChartTooltip unit=" projects" />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {rows.map((r) => (
              <Cell key={r.label} fill={r.color} />
            ))}
            <LabelList dataKey="value" position="right" className="tabular" style={{ fontSize: 12, fill: "#334155", fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series hours bar chart (one hue, no legend — the card title names it). */
export function HoursBarChart({ data }: { data: { label: string; value: number; sub?: string }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 40 + 24) }} role="img" aria-label={`Hours this week: ${data.map((r) => `${r.label} ${r.value}h`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} unit="h" />
          <YAxis type="category" dataKey="label" width={150} tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(99,102,241,0.06)" }} content={<ChartTooltip unit="h" />} />
          <Bar dataKey="value" fill="#6f8ff0" radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => `${v}h`} style={{ fontSize: 12, fill: "#334155", fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
