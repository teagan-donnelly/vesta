import { shift } from "./analysis";
import type { FinancialData } from "./types";
export const categoryColors: Record<string, string> = {
  Housing: "#800f1a", Education: "#9e3541", Groceries: "#ca7877",
  Restaurants: "#c49a61", Transport: "#8d7a9d", Shopping: "#c7aaa0",
  Utilities: "#807f78", Subscription: "#a88cba", Healthcare: "#8eaaa1", Other: "#b9b0a5",
};
export function historyView(data: FinancialData, days: number) {
  const count = [7, 30, 60].includes(days) ? days : 30;
  const start = shift(data.asOf, 1-count);
  const transactions = data.transactions.filter(t => !t.pending && t.date >= start && t.date <= data.asOf && t.amountCents < 0);
  const categories = [...new Set(transactions.map(t => t.category))].sort();
  const series = categories.map((name, index) => ({ name, key: `category${index}`, color: categoryColors[name] || categoryColors.Other }));
  const spending = Array.from({ length: count }, (_, i) => {
    const date = shift(start, i), row: Record<string, string | number> = { date, total: 0 };
    for (const category of series) {
      const amount = transactions.filter(t => t.date === date && t.category === category.name).reduce((sum,t) => sum-t.amountCents, 0);
      row[category.key] = amount; row.total = Number(row.total)+amount;
    }
    return row;
  });
  return { start, end: data.asOf, days: count, series, spending,
    balances: (data.balanceHistory || []).filter(p => p.date >= start && p.date <= data.asOf),
    spendingCents: spending.reduce((sum,p) => sum+Number(p.total),0),
  };
}
export function expenseChartRows(view: ReturnType<typeof historyView>, logarithmic: boolean) {
  return view.spending.map(row=>({...row,date:String(row.date),value:0,original:row,
    ...Object.fromEntries(view.series.map(s=>[s.key,logarithmic?Math.log10(1+Number(row[s.key])/100):row[s.key]])),
  }));
}
export function expenseAxisCents(value:number,logarithmic:boolean) {
  return logarithmic ? Math.round((10**value-1)*100) : value;
}
