import { loadEnvConfig } from "@next/env";
import { nessieRequest } from "../lib/nessie";
loadEnvConfig(process.cwd());
async function main() {
  const customers = (await nessieRequest("/customers")) as {
    _id: string;
    first_name: string;
    last_name: string;
  }[];
  const targets = customers.filter(
    (c) => c.first_name === "Vesta" && c.last_name === "Fictional Test",
  );
  console.log(
    JSON.stringify({
      customers: customers.length,
      fictionalCustomers: targets.length,
    }),
  );
  for (const customer of targets) {
    const accounts = (await nessieRequest(
      `/customers/${encodeURIComponent(customer._id)}/accounts`,
    )) as { _id: string; nickname: string; type: string; balance: number }[];
    for (const account of accounts) {
      const counts: Record<string, unknown> = {
        account: account.nickname,
        type: account.type,
        balanceDollars: account.balance,
      };
      for (const kind of ["deposits", "withdrawals", "bills", "loans"]) {
        const records = (await nessieRequest(
          `/accounts/${encodeURIComponent(account._id)}/${kind}`,
        )) as Record<string, unknown>[];
        counts[kind] = {
          count: records.length,
          fields: records.length ? Object.keys(records[0]) : [],
          statuses: [...new Set(records.map((r) => r.status))],
        };
      }
      console.log(JSON.stringify(counts));
    }
  }
  const merchants = await nessieRequest("/merchants");
  console.log(
    JSON.stringify({
      merchants: Array.isArray(merchants)
        ? merchants.length
        : "Unexpected response",
    }),
  );
}
main().catch((error) => {
  console.log(error instanceof Error ? error.message : "Inspection failed.");
  process.exitCode = 1;
});
