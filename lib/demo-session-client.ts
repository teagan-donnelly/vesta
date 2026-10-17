// A single cookie bootstrap avoids racing fresh sessions when several client
// components mount together. Contains no financial data or identity credentials.
let bootstrap: Promise<void> | undefined;
export function ensureDemoSession() {
  return (bootstrap ||= fetch("/api/collaboration?profile=kevin&list=1", {
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
