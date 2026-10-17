// A single cookie bootstrap avoids racing fresh sessions when several client
// components mount together. Contains no financial data or identity credentials.
let bootstrap: Promise<void> | undefined;
export function ensureDemoSession() {
  return (bootstrap ||= fetch("/api/demo-session", {
    cache: "no-store",
  })
    .then((r) => {
      if (!r.ok) throw Error("Fictional demo storage unavailable.");
    })
    .catch((e) => {
      bootstrap = undefined;
      throw e;
    }));
}
