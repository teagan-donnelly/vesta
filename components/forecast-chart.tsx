"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from "recharts";
import { comparisonRows, chartDomain, riskIntervals } from "@/lib/chart-data";
import { formatCurrency } from "@/lib/analysis";
import { dateLabel } from "./activity-table";
type Point = { date: string; balanceCents: number };
export function ForecastChart({
  points,
  scenarioPoints,
  height = 360,
}: {
  points: Point[];
  scenarioPoints?: Point[];
  height?: number;
  color?: string;
}) {
  const rows = comparisonRows(points, scenarioPoints);
  const domain = chartDomain(rows);
  const intervals = riskIntervals(rows);
  const low = rows.reduce<{ date: string; value: number } | null>((a, r) => {
    const value = Math.min(r.baseline, r.scenario ?? Infinity);
    return !a || value < a.value ? { date: r.date, value } : a;
  }, null);
  if (!rows.length)
    return <div className="chart-empty">No forecast points available.</div>;
  return (
    <figure
      aria-label={
        scenarioPoints
          ? "Without changes and simulation on a shared balance scale"
          : "Projected cash balance"
      }
      style={{ margin: 0 }}
    >
      <div className="chart-legend" style={{ padding: "0 20px 10px" }}>
        <span>
          <i className="legend-dot" />
          Without changes
        </span>
        {scenarioPoints && (
          <span>
            <i className="legend-dot scenario" />
            With your changes
          </span>
        )}
        {intervals.length > 0 && <span className="negative">Below zero</span>}
      </div>
      <div className="chart-frame" style={{ height }}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 700, height }}
        >
          <LineChart
            data={rows}
            margin={{ top: 16, right: 24, bottom: 16, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid stroke="#edf0f3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => dateLabel(value)}
              tick={{ fontSize: 14, fill: "#5f6f85" }}
              axisLine={false}
              tickLine={false}
              minTickGap={55}
              tickMargin={12}
            />
            <YAxis
              domain={domain}
              width={72}
              tickFormatter={(value) =>
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(value / 100)
              }
              tick={{ fontSize: 14, fill: "#5f6f85" }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            {intervals.map((range, i) => (
              <ReferenceArea
                key={i}
                x1={range.start}
                x2={range.end}
                fill="#bd3743"
                fillOpacity={0.045}
              />
            ))}
            <ReferenceLine y={0} stroke="#c8a3a9" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "#cfd5de", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const base = payload.find(
                  (p) => p.dataKey === "baseline",
                )?.value;
                const scenario = payload.find(
                  (p) => p.dataKey === "scenario",
                )?.value;
                return (
                  <div className="chart-tooltip">
                    <strong>{dateLabel(String(label), true)}</strong>
                    {typeof base === "number" && (
                      <p>
                        Without changes{" "}
                        <span className="amount">{formatCurrency(base)}</span>
                      </p>
                    )}
                    {typeof scenario === "number" && (
                      <p>
                        With your changes{" "}
                        <span className="amount">
                          {formatCurrency(scenario)}
                        </span>
                      </p>
                    )}
                    {typeof base === "number" &&
                      typeof scenario === "number" && (
                        <p>
                          Difference{" "}
                          <span
                            className={
                              scenario >= base ? "positive" : "negative"
                            }
                          >
                            {formatCurrency(scenario - base)}
                          </span>
                        </p>
                      )}
                  </div>
                );
              }}
            />
            <Line
              dataKey="baseline"
              name="Without changes"
              type="stepAfter"
              stroke="#24354d"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
            />
            {scenarioPoints && (
              <Line
                dataKey="scenario"
                name="With your changes"
                type="stepAfter"
                stroke="#7d3548"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                isAnimationActive={false}
              />
            )}
            {low && low.value < 0 && (
              <ReferenceDot
                x={low.date}
                y={low.value}
                r={3.5}
                fill="#bd3743"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Balances are calculated in integer cents, displayed in US dollars. Both
        forecasts share the same dates and vertical scale, which includes zero.
        Red shading marks periods below zero. Use the daily balance table for
        exact values.
      </figcaption>
    </figure>
  );
}
