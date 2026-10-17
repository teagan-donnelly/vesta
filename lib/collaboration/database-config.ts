import type { PoolConfig } from "pg";
export function databaseConfig(
  connectionString: string,
  ca?: string,
): PoolConfig {
  const url = new URL(connectionString);
  // Keep certificate and hostname validation. A service-specific CA is needed
  // when the database chain is not rooted in the runtime's trusted authorities.
  if (ca) {
    const certificate = ca.replace(/\\n/g, "\n");
    if (!certificate.includes("-----BEGIN CERTIFICATE-----"))
      throw new Error("Invalid database CA configuration.");
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
      url.searchParams.delete(key);
    return {
      connectionString: url.toString(),
      ssl: { ca: certificate, rejectUnauthorized: true },
    };
  }
  return { connectionString };
}
