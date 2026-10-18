import type { PoolConfig } from "pg";
export function databaseConfig(
  connectionString: string,
  ca?: string,
): PoolConfig {
  const url = new URL(connectionString);
  const mode = url.searchParams.get("sslmode");
  if (mode && !["prefer", "require", "verify-ca", "verify-full"].includes(mode))
    throw Object.assign(new Error("Database TLS verification is required."), { code: "TLS_REQUIRED" });
  // pg's meaning of `require` is changing. Preserve certificate AND hostname
  // verification explicitly, without modifying the user's environment value.
  url.searchParams.delete("ssl");
  url.searchParams.delete("uselibpqcompat");
  // Keep certificate and hostname validation. A service-specific CA is needed
  // when the database chain is not rooted in the runtime's trusted authorities.
  if (ca) {
    const certificate = ca.replace(/\\n/g, "\n");
    if (!certificate.includes("-----BEGIN CERTIFICATE-----"))
      throw Object.assign(new Error("Invalid database CA configuration."), { code: "INVALID_CA" });
    for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"])
      url.searchParams.delete(key);
    return {
      connectionString: url.toString(),
      ssl: { ca: certificate, rejectUnauthorized: true },
    };
  }
  url.searchParams.set("sslmode", "verify-full");
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: true } };
}
