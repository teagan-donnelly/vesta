// Provider messages/detail/hint can contain credentials, SQL or user data.
// Return only recognized codes, static guidance and a numeric SQL position.
export function databaseDiagnostic(error: unknown) {
  const raw = error as { code?: unknown; position?: unknown } | null;
  const known: Record<string, string> = {
    TLS_REQUIRED: "TLS encryption, certificate trust and hostname verification are required. Do not disable verification.",
    INVALID_CA: "TIGER_DATABASE_CA must contain the trusted PEM certificate chain, using actual newlines or literal \\n.",
    HYPERTABLE_MISSING: "The readiness table is not a Timescale hypertable. Review and rerun the planning migration.",
    WRONG_ADAPTER: "Vesta did not select Tiger Data. Check TIGER_DATABASE_URL and explicit local-storage selection.",
    SELF_SIGNED_CERT_IN_CHAIN: "Certificate chain is not trusted. New paid Tiger services may need about 30 minutes for a signed certificate. Retry after provisioning; otherwise obtain the provider's trusted CA for TIGER_DATABASE_CA.",
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: "Certificate chain is incomplete or untrusted. Configure the service's trusted CA in TIGER_DATABASE_CA.",
    DEPTH_ZERO_SELF_SIGNED_CERT: "The service certificate is self-signed. Configure its trusted CA in TIGER_DATABASE_CA.",
    CERT_HAS_EXPIRED: "The service certificate or configured CA has expired. Check the service's current certificate chain.",
    ERR_TLS_CERT_ALTNAME_INVALID: "The database hostname does not match its certificate. Use the service's exact connection hostname.",
    ENOTFOUND: "Database hostname could not be resolved. Check the service hostname and DNS.",
    ECONNREFUSED: "Database connection refused. Check the service status and port.",
    ETIMEDOUT: "Database connection timed out. Check service status and network access rules.",
    "28P01": "Database authentication failed. Check the new service's username/password and URL encoding; existing shell variables override .env.local.",
    "3D000": "Database does not exist. Use the database name supplied for the new service.",
    "42501": "Database role lacks permission. Use the service owner or grant the required schema/extension privileges.",
    "42P01": "Planning schema is missing or incomplete. Apply the planning migration to this same database.",
    "42703": "An existing database object has incompatible columns. Review the schema before applying changes.",
    "42883": "A required function is unavailable. Check the installed Timescale version and hypertable API support.",
    "0A000": "The service does not support a required SQL feature or extension. Check Timescale availability and service capabilities.",
    ERR_INVALID_URL: "Database URL is invalid. Use the new service's PostgreSQL URI with correctly encoded credentials.",
  };
  const candidate = typeof raw?.code === "string" ? raw.code : "";
  const code = Object.hasOwn(known, candidate) || /^[0-9A-Z]{5}$/.test(candidate) ? candidate : "UNCLASSIFIED";
  const position = typeof raw?.position === "string" && /^\d{1,9}$/.test(raw.position) ? Number(raw.position) : undefined;
  return {
    code,
    guidance: known[code] || "Check the reported stage, service status, role permissions and SQL compatibility. Raw provider details are suppressed.",
    ...(position ? { position } : {}),
  };
}
