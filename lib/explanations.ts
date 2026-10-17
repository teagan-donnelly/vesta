import { explanationFacts } from "./explanation-facts";
import type { FinancialData, Simulation } from "./types";
export async function explain(
  data: FinancialData,
  simulation: Simulation = {},
) {
  const facts = explanationFacts(data, simulation);
  const fallback = (reason: string) => ({
    source: "deterministic" as const,
    reason,
    explanations: facts.map((f) => f.text),
  });
  if (!process.env.GEMINI_API_KEY)
    return fallback("Gemini key is not configured.");
  try {
    // Gemini selects and orders verified explanations. Free-form model claims never
    // enter the UI, so it cannot introduce invented balances or financial outcomes.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Prioritize the supplied verified financial explanations for immediate action. Return only a JSON array of their IDs, most important first. Include all IDs once. Do not create new facts or text.",
              },
            ],
          },
          contents: [{ parts: [{ text: JSON.stringify(facts) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
            maxOutputTokens: 1024,
          },
        }),
      },
    );
    if (!response.ok)
      return fallback(`Gemini returned HTTP ${response.status}.`);
    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("");
    const ids: unknown = JSON.parse(raw);
    if (
      !Array.isArray(ids) ||
      ids.length !== facts.length ||
      new Set(ids).size !== facts.length ||
      !ids.every((id) => facts.some((f) => f.id === id))
    )
      return fallback("Gemini returned an invalid explanation selection.");
    return {
      source: "gemini" as const,
      reason:
        "Gemini prioritized verified explanations; all financial facts are calculated by Vesta.",
      explanations: ids.map((id) => facts.find((f) => f.id === id)!.text),
    };
  } catch {
    return fallback("Gemini is unavailable or timed out.");
  }
}
