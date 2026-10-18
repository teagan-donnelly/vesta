"use client";
import { useId } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/analysis";
import { historyView } from "@/lib/history-view";
import type { FinancialData } from "@/lib/types";
import { dateLabel } from "./activity-table";
export function HomeHistoryChart({ data, days, expenses }: { data: FinancialData; days: number; expenses: boolean }) {
  const view = historyView(data, days), id = useId().replace(/:/g, "");
  const Chart = expenses ? BarChart : AreaChart;
  return <div>
    {expenses && <div className="history-category-legend">{view.series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.name}</span>)}</div>}
    <div className="home-history-chart" role="img" aria-label={`${expenses ? "Daily spending by category" : "Historical daily closing balances"} · last ${view.days} days`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 760, height: 360 }}>
        <Chart data={expenses ? view.spending : view.balances} margin={{ top: 20, right: 24, left: 4, bottom: 12 }} accessibilityLayer>
          <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#800f1a" stopOpacity={0.22}/><stop offset="100%" stopColor="#800f1a" stopOpacity={0.015}/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#e8ded4" strokeDasharray="3 5" />
          <XAxis dataKey="date" tickFormatter={v => dateLabel(String(v))} interval="preserveStartEnd" minTickGap={48} tickMargin={12} tick={{ fontSize: 12, fill: "#746b64" }} axisLine={false} tickLine={false}/>
          <YAxis width={78} domain={[(min: number) => Math.min(0,min), "auto"]} tickFormatter={v => formatCurrency(Number(v))} tick={{ fontSize: 12, fill: "#746b64" }} axisLine={false} tickLine={false}/>
          <Tooltip cursor={{ stroke: "#b5888c", strokeDasharray: "3 3" }} content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return <div className="chart-tooltip"><strong>{dateLabel(String(label), true)}</strong>{payload.filter(p => Number(p.value)>0 || !expenses).map(p => <p key={String(p.dataKey)}><span style={{ color: p.color }}>{p.name}</span><span className="amount">{formatCurrency(Number(p.value))}</span></p>)}{expenses && <p><strong>Total spent</strong><strong>{formatCurrency(Number(payload[0]?.payload.total || 0))}</strong></p>}</div>;
          }}/>
          {expenses ? view.series.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} stackId="spending" fill={s.color} maxBarSize={24} isAnimationActive={false}/>) : <Area type="linear" dataKey="value" name="Historical closing cash" stroke="#800f1a" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" fill={`url(#${id})`} dot={false} activeDot={{ r: 5, fill: "#800f1a", stroke: "#fff", strokeWidth: 3 }} isAnimationActive={false}/>}
        </Chart>
      </ResponsiveContainer>
    </div>
  </div>;
}
