export const mainDestinations = [
  { href: "/", label: "Home", paths: ["/", "/continuity"] },
  {
    href: "/shared",
    label: "Shared Finances",
    paths: ["/shared", "/deadbolt"],
  },
  {
    href: "/plan",
    label: "Plan Ahead",
    paths: ["/plan", "/domino", "/protect", "/credit"],
  },
  { href: "/assistant", label: "Ask Vesta", paths: ["/assistant"] },
] as const;
export const planningSections = [
  { id: "forecast", label: "Forecast", href: "/plan?section=forecast" },
  {
    id: "spending",
    label: "Spending & Subscriptions",
    href: "/plan?section=spending",
  },
  { id: "credit", label: "Credit Guidance", href: "/plan?section=credit" },
] as const;
export function destinationFor(path: string) {
  return mainDestinations.find((item) =>
    (item.paths as readonly string[]).includes(path),
  );
}
export function sectionFor(path: string, requested: string | null) {
  return path === "/protect"
    ? "spending"
    : path === "/credit"
      ? "credit"
      : planningSections.find((s) => s.id === requested)?.id || "forecast";
}
export function readinessLabel(status: string, name = "This member") {
  if (status === "not shared")
    return `${name} hasn't shared their financial outlook.`;
  if (status === "appears achievable") return "Looks on track";
  if (status === "may be at risk") return "May be short";
  return "Not enough information yet";
}
