"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/analysis";
import { dateLabel } from "./activity-table";
import { EmptyState } from "./ui";
const colors = [
  "#800f1a",
  "#ca4149",
  "#e7a054",
  "#e6a9a0",
  "#a782c9",
  "#bdb6ad",
];
export function HistoryChart({
  points,
  bars = false,
  currency = true,
  label,
}: {
  points: { date: string; value: number }[];
  bars?: boolean;
  currency?: boolean;
  label: string;
}) {
  if (!points.length)
    return (
      <EmptyState
        title="No saved history yet"
        description="Only recorded observations appear here. Vesta does not invent historical values."
      />
    );
  const Chart = bars ? BarChart : LineChart;
  return (
    <div className="record-chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart
          data={points}
          margin={{ left: 4, right: 22, top: 16, bottom: 8 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#eae0d5"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => dateLabel(date)}
            tick={{ fontSize: 12, fill: "#67635f" }}
            minTickGap={35}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={68}
            tickFormatter={(value) =>
              currency ? formatCurrency(value) : String(value)
            }
            tick={{ fontSize: 12, fill: "#67635f" }}
            axisLine={false}
            tickLine={false}
            domain={currency ? [0, "auto"] : [300, 850]}
          />
          <Tooltip
            labelFormatter={(date) => dateLabel(String(date), true)}
            formatter={(value) =>
              currency ? formatCurrency(Number(value)) : String(value)
            }
            contentStyle={{
              background: "#fffcf7",
              border: "1px solid #eae0d5",
              borderRadius: 10,
            }}
          />
          {bars ? (
            <Bar
              name="Expenses"
              dataKey="value"
              fill="#bb6e70"
              radius={[3, 3, 0, 0]}
              activeBar={{ fill: "#800f1a" }}
            />
          ) : (
            <Line
              name={currency ? "Recorded value" : "Recorded score"}
              dataKey="value"
              stroke="#800f1a"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
export function AllocationChart({
  items,
  label,
}: {
  items: { name: string; value: number }[];
  label: string;
}) {
  const total = items.reduce((s, item) => s + item.value, 0);
  if (!total)
    return (
      <EmptyState
        title="No allocation to display"
        description="Add records to see a breakdown based on your own information."
      />
    );
  return (
    <div className="allocation">
      <div className="allocation-donut">
        <ResponsiveContainer width="100%" height={205}>
          <PieChart>
            <Pie
              data={items}
              dataKey="value"
              nameKey="name"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={1}
              stroke="none"
            >
              {items.map((item, i) => (
                <Cell key={item.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div>
          <strong>{formatCurrency(total)}</strong>
          <span>{label}</span>
        </div>
      </div>
      <ul>
        {items.map((item, i) => (
          <li key={item.name}>
            <i style={{ background: colors[i % colors.length] }} />
            <span>{item.name}</span>
            <small>{Math.round((item.value / total) * 100)}%</small>
            <strong>{formatCurrency(item.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
