import { Suspense } from "react";
import Forecast from "../domino/page";
import Spending from "../protect/page";
import Credit from "../credit/page";
import { AegisShell } from "@/components/aegis-shell";
import { LoadingState } from "@/components/ui";
import { ManagementPage } from "@/components/planning-workbench";
type Props = { searchParams: Promise<{ section?: string }> };
async function Content({ searchParams }: Props) {
  const { section } = await searchParams;
  if (
    ["goals", "budget", "credit", "investing", "protection"].includes(
      section || "",
    )
  )
    return (
      <ManagementPage
        section={
          section as "goals" | "budget" | "credit" | "investing" | "protection"
        }
      />
    );
  return section === "spending" ? (
    <Spending />
  ) : section === "credit" ? (
    <Credit />
  ) : (
    <Forecast />
  );
}
export default function PlanPage(props: Props) {
  return (
    <Suspense
      fallback={
        <AegisShell
          title="Plan Ahead"
          subtitle="Test financial decisions before making them."
        >
          <LoadingState />
        </AegisShell>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
