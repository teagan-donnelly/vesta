import {forecastEvents,project,shift} from "../analysis";
import {paymentReadiness} from "../planning-options";
import type {FinancialData,Simulation} from "../types";
import type {FinancialRecommendation} from "../assistant-presentation";

// All figures and actions come from the existing engine, never model output.
export function calculatedRecommendation(data:FinancialData,current:Simulation,choice:{label:string;description:string;simulation:Simulation},deadline:string,eventId:string|undefined,index:number,spanish:boolean):FinancialRecommendation {
  const before=project(data,current),after=project(data,choice.simulation);
  const beforePoint=before.points.find(p=>p.date===deadline),afterPoint=after.points.find(p=>p.date===deadline);
  const event=forecastEvents(data).find(e=>e.id===choice.simulation.eventId);
  const delayed=Boolean(choice.simulation.delayDays);
  const readableDates=(text:string)=>text.replace(/\d{4}-\d{2}-\d{2}/g,date=>new Intl.DateTimeFormat(spanish?"es":"en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T00:00:00Z")));
  return {
    id:`option-${index}`,title:spanish?(delayed?`Posponer ${event?.label || "la compra opcional"}`:"Revisar gastos opcionales"):choice.label,
    change:readableDates(spanish?(delayed&&event?`Mover ${event.label} del ${event.date} al ${shift(event.date,choice.simulation.delayDays!)}. No retrasa un pago obligatorio.`:"Revisar los cargos y el importe de la compra opcional en este escenario; los detalles aparecen en Domino."):choice.description),
    deadline,freedCents:(afterPoint?.balanceCents || 0)-(beforePoint?.balanceCents || 0),beforeCents:before.lowestBalanceCents,afterCents:after.lowestBalanceCents,
    shortfallCents:eventId?paymentReadiness(data,eventId,choice.simulation)?.shortfallCents ?? null:null,
    limitation:spanish?(delayed?"Libera efectivo temporalmente; la compra sigue en el plan. Los ingresos previstos no están garantizados.":"No cancela ningún servicio ni mueve dinero. Los cargos futuros son estimaciones."):(delayed?"Frees cash temporarily; the purchase remains in the plan. Expected income is not guaranteed.":"Does not cancel a service or move money. Future charges are estimates."),
    simulation:choice.simulation,
  };
}
