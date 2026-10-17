import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
loadEnvConfig(process.cwd());
const keys = [
  "NESSIE_API_KEY",
  "GEMINI_API_KEY",
  "BACKBOARD_API_KEY",
  "TIGER_DATABASE_URL",
  "TIGER_DATABASE_CA",
]
  .map((k) => process.env[k])
  .filter((v): v is string => Boolean(v));
function assertNoKey(contents: Buffer | string) {
  for (const secret of keys)
    if (contents.includes(secret)) {
      throw new Error(
        "Secret detected. Check failed; secret value suppressed.",
      );
    }
}
function scan(path: string) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, item.name);
    // OneDrive reparse-point directories can be reported as non-directory
    // Dirents on Windows. Follow filesystem metadata before reading a file.
    if (item.isDirectory() || statSync(child).isDirectory()) scan(child);
    else assertNoKey(readFileSync(child));
  }
}
// Deleted paths have no staged contents to scan.
const staged = execFileSync(
  "git",
  ["diff", "--cached", "--diff-filter=ACMRT", "--name-only", "-z"],
  {
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);
for (const path of staged) {
  if (
    /(^|\/)(node_modules|\.next|\.tmp|\.vesta-sandbox|\.vesta-demo)(\/|$)|(^|\/)\.env\.local$/.test(
      path,
    )
  )
    throw new Error("Generated or private file is staged.");
  assertNoKey(execFileSync("git", ["show", `:${path}`]));
}
if (existsSync(".next/static")) scan(".next/static");
execFileSync("git", ["check-ignore", ".env.local"], { stdio: "ignore" });
console.log(
  `Secret checks passed: ${staged.length} staged files and browser build assets; .env.local remains ignored.`,
);
