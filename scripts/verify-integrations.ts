import { loadEnvConfig } from "@next/env";
import { loadNessie } from "../lib/nessie";
import { explain } from "../lib/explanations";
import { demoData } from "../lib/data";
loadEnvConfig(process.cwd());
async function main() {
  try {
    const data = await loadNessie();
    console.log(
      JSON.stringify({
        nessie: "success",
        customers: data.customers.length,
        accounts: data.accounts.length,
        transactions: data.transactions.length,
        bills: data.bills.length,
        loans: data.loans.length,
        warnings: data.warnings,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        nessie: "failed",
        error: error instanceof Error ? error.message : "Unavailable",
      }),
    );
  }
  const result = await explain(demoData());
  console.log(
    JSON.stringify({
      gemini: result.source === "gemini" ? "success" : "failed",
      reason: result.reason,
    }),
  );
}
main().catch(() => {
  console.log("Verification failed.");
  process.exitCode = 1;
});
