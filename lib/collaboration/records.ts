import type { DemoState } from "./model";
import { recordScope, type PersonalRecord } from "../management";
export function personalRecords(
  state: DemoState,
  mode: string,
  customer: string,
) {
  const scope = recordScope(mode, customer);
  // JSON private-plan storage already persists atomically in Tiger. Generic demo
  // and Nessie metadata have separate source/customer keys and are never exposed
  // by collaborative payloads or attached to a fictional member's finances.
  const owner =
    mode === "demo" && customer.startsWith("demo:")
      ? (customer.slice(5) as "ava" | "kevin" | "maya")
      : "kevin";
  const plan = state.plans[owner];
  const sets = (plan.recordSets ||= {});
  return {
    records: sets[scope] || [],
    save: (records: PersonalRecord[]) => {
      sets[scope] = records;
    },
  };
}
