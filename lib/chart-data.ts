import type { CashFlowProjectionPoint } from "./types";
export function comparisonRows(
  baseline: Pick<CashFlowProjectionPoint, "date" | "balanceCents">[],
  scenario?: Pick<CashFlowProjectionPoint, "date" | "balanceCents">[],
) {
  const byDate = new Map(scenario?.map((p) => [p.date, p.balanceCents]));
  return baseline.map((p) => ({
    date: p.date,
    baseline: p.balanceCents,
    ...(scenario ? { scenario: byDate.get(p.date) } : {}),
  }));
}
export function chartDomain(
  rows: ReturnType<typeof comparisonRows>,
): [number, number] {
  const values = rows
    .flatMap((r) => [
      r.baseline,
      ...(r.scenario === undefined ? [] : [r.scenario]),
    ])
    .filter(Number.isFinite);
  if (!values.length) return [0, 10000];
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  const padding = Math.max((max - min) * 0.08, 10000);
  return [
    min < 0 ? Math.floor((min - padding) / 10000) * 10000 : 0,
    Math.ceil((max + padding) / 10000) * 10000,
  ];
}
export function riskIntervals(rows: ReturnType<typeof comparisonRows>) {
  const intervals: { start: string; end: string }[] = [];
  let start: string | null = null;
  rows.forEach((row, index) => {
    const negative =
      row.baseline < 0 || (row.scenario !== undefined && row.scenario < 0);
    if (negative && !start) start = row.date;
    if (start && (!negative || index === rows.length - 1)) {
      intervals.push({ start, end: row.date });
      start = null;
    }
  });
  return intervals;
}
