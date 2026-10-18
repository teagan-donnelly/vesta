import { forecastEvents, project, shift, subscriptionsFor } from "./analysis";
import type { FinancialData, Simulation } from "./types";

export function paymentReadiness(data: FinancialData, eventId: string, simulation: Simulation = {}) {
  const events = forecastEvents(data), event = events.find(e => e.id === eventId);
  if (!event || event.amountCents >= 0) return null;
  const point = project(data, simulation).points.find(p => p.date === event.date);
  if (!point) return null;
  const sameDay = events.filter(e => e.date === event.date && e.amountCents < 0 && e.id.startsWith("bill:shared-")).sort((a,b) => a.id.localeCompare(b.id));
  let available = Math.max(0, point.balanceCents + sameDay.reduce((sum, e) => sum - e.amountCents, 0));
  for (const other of sameDay) {
    const covered = Math.min(-other.amountCents, available);
    if (other.id === eventId) return { event, coveredCents: covered, shortfallCents: -event.amountCents - covered };
    available -= covered;
  }
  const covered = Math.min(-event.amountCents, Math.max(0, point.balanceCents - event.amountCents));
  return { event, coveredCents: covered, shortfallCents: -event.amountCents - covered };
}

export function planningOptions(data: FinancialData, current: Simulation = {}, preferences: string[] = []) {
  const events = forecastEvents(data);
  const target = events.find(e => e.id.startsWith("bill:shared-") && (paymentReadiness(data, e.id, current)?.shortfallCents || 0) > 0);
  if (!target) return [];
  const before = paymentReadiness(data, target.id, current)!;
  const protectedGym = [...(data.planningPreferences || []), ...preferences].some(p => /gym|fitness|gimnasio/i.test(p));
  const subscriptions = subscriptionsFor(data).filter(s => s.nextChargeDate <= target.date && !(protectedGym && /gym|fitness|gimnasio/i.test(s.merchant)));
  const optional = data.transactions.find(t => t.discretionary && t.pending && t.amountCents < 0 && t.date > data.asOf && t.date <= target.date && (!current.eventId || current.eventId === `pending:${t.id}`));
  const nextIncome = events.find(e => e.amountCents > 0 && e.date > target.date);
  const choices: { label: string; description: string; simulation: Simulation }[] = [];
  if (optional && nextIncome) {
    const date = shift(nextIncome.date, 2);
    const days = (Date.parse(date) - Date.parse(optional.date)) / 86400000;
    if (days > 0 && days <= 30 && date <= shift(data.asOf, 30)) choices.push({
      label: `Postpone ${optional.merchant}`,
      description: `Move the optional purchase from ${optional.date} to ${date}, after expected income on ${nextIncome.date}. No contractual payment is delayed.`,
      simulation: { ...current, eventId: `pending:${optional.id}`, delayDays: days, paymentCents: undefined },
    });
    const sub = subscriptions.filter(s => !current.removedSubscriptions?.includes(s.id)).sort((a,b) => b.amountCents-a.amountCents)[0];
    if (sub) {
      const remaining = Math.max(0, Math.abs(optional.amountCents) - Math.max(0, before.shortfallCents - sub.amountCents + 1000));
      choices.push({ label: `Review ${sub.merchant} + reduce the optional purchase`, description: `Remove the estimated ${sub.merchant} charge before the shared deadline and cap ${optional.merchant} at $${(remaining/100).toFixed(2)}. This is a plan, not a cancellation.`, simulation: { ...current, eventId: `pending:${optional.id}`, delayDays: 0, paymentCents: remaining, removedSubscriptions: [...new Set([...(current.removedSubscriptions || []), sub.id])] } });
    }
  }
  for (const sub of subscriptions) choices.push({ label: `Review ${sub.merchant}`, description: `Remove its estimated charge on ${sub.nextChargeDate} from this what-if plan only.`, simulation: { ...current, removedSubscriptions: [...new Set([...(current.removedSubscriptions || []), sub.id])] } });
  return choices.map(choice => {
    const after = paymentReadiness(data, target.id, choice.simulation)!;
    return { ...choice, eventId: target.id, dueDate: target.date, beforeCents: project(data, current).lowestBalanceCents, afterCents: project(data, choice.simulation).lowestBalanceCents, beforeCoveredCents: before.coveredCents, afterCoveredCents: after.coveredCents, improvementCents: after.coveredCents-before.coveredCents, shortfallCents: after.shortfallCents };
  }).filter(c => c.improvementCents > 0);
}
