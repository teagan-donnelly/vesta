"use client";
import { useSyncExternalStore } from "react";
const event = "vesta-language-change",
  key = "vesta.assistant.language";
let memory = "en";
function snapshot() {
  try {
    const saved = window.localStorage.getItem(key);
    return saved === "es" ? "es" : saved === "en" ? "en" : memory;
  } catch {
    return memory;
  }
}
function subscribe(change: () => void) {
  window.addEventListener(event, change);
  window.addEventListener("storage", change);
  return () => {
    window.removeEventListener(event, change);
    window.removeEventListener("storage", change);
  };
}
export function useAssistantLanguage() {
  const language = useSyncExternalStore(subscribe, snapshot, () => "en");
  return [
    language,
    (next: string) => {
      memory = next === "es" ? "es" : "en";
      try {
        window.localStorage.setItem(key, memory);
      } catch {}
      window.dispatchEvent(new Event(event));
    },
  ] as const;
}
