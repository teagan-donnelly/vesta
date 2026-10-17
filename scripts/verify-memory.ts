import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import {
  backboard,
  clearRemote,
  ensureAssistant,
  remotePreferences,
} from "../lib/collaboration/backboard";
import { privateDefault } from "../lib/collaboration/model";
loadEnvConfig(process.cwd());
async function main() {
  const kevin = privateDefault(),
    ava = privateDefault();
  let phase = "save preference";
  try {
    const tag = randomUUID();
    const preference = `Fictional verification ${tag}: keep my gym membership.`;
    await remotePreferences(kevin, `verification-kevin-${tag}`, [preference]);
    phase = "create separate profile";
    await ensureAssistant(ava, `verification-ava-${tag}`);
    phase = "retrieve saved preference";
    const own = await backboard(
      `/assistants/${encodeURIComponent(kevin.assistantId!)}/memories`,
    );
    const other = await backboard(
      `/assistants/${encodeURIComponent(ava.assistantId!)}/memories`,
    );
    if (
      !(own.memories || []).some(
        (m: { content?: string }) => m.content === preference,
      ) ||
      (other.memories || []).some(
        (m: { content?: string }) => m.content === preference,
      )
    )
      throw Error();
    phase = "correct preference";
    await remotePreferences(kevin, `verification-kevin-${tag}`, [
      `Fictional corrected preference ${tag}: keep my gym.`,
    ]);
    const corrected = await backboard(
      `/assistants/${encodeURIComponent(kevin.assistantId!)}/memories`,
    );
    if (
      !(corrected.memories || []).some((m: { content?: string }) =>
        m.content?.includes("corrected preference"),
      )
    )
      throw Error();
    console.log(
      "Backboard verified: fictional preference saved, retrieved, corrected, and absent from the other profile.",
    );
  } catch (error) {
    const status =
      error instanceof Error
        ? error.message.match(/HTTP \d{3}/)?.[0]
        : undefined;
    console.error(
      `Backboard memory verification failed at ${phase}${status ? ` (${status})` : ""}; credentials and provider contents suppressed.`,
    );
    process.exitCode = 1;
  } finally {
    for (const plan of [kevin, ava]) {
      try {
        await clearRemote(plan);
      } catch {
        console.error(
          "Could not remove a verification-only assistant; review Backboard dashboard for Vesta fictional demo verification entries.",
        );
        process.exitCode = 1;
      }
    }
  }
}
void main();
