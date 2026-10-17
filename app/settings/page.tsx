import { AegisShell } from "@/components/aegis-shell";
import { DataSettings } from "@/components/data-settings";
import { LocalSandboxSetup } from "@/components/local-sandbox-setup";
import { PlanningSettings } from "@/components/planning-settings";
export default function SettingsPage() {
  const setupAvailable =
    process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  return (
    <AegisShell
      title="Settings"
      subtitle="Manage your data source, privacy, and financial workspace."
    >
      <PlanningSettings />
      <details className="secondary-details section-gap" id="diagnostics">
        <summary>Financial data, connections & developer diagnostics</summary>
        <DataSettings />
        {setupAvailable && <LocalSandboxSetup />}
      </details>
    </AegisShell>
  );
}
