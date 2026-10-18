import { profileSnapshot } from "./profile-preferences";
export const defaultDisplay = { appearance: "light", dateFormat: "short" };
export type DisplayPreferences = typeof defaultDisplay;
const key = () => `vesta.display.${profileSnapshot()}`;
export function readDisplay(): DisplayPreferences {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key()) || "{}");
    return {
      appearance: ["light", "dark", "system"].includes(parsed.appearance)
        ? parsed.appearance
        : "light",
      dateFormat: ["short", "MM/DD/YYYY", "DD/MM/YYYY", "ISO"].includes(
        parsed.dateFormat,
      )
        ? parsed.dateFormat
        : "short",
    };
  } catch {
    return defaultDisplay;
  }
}
export function cacheDisplay(value: DisplayPreferences) {
  try {
    window.localStorage.setItem(key(), JSON.stringify(value));
  } catch {
    /* Device preferences can remain unavailable without affecting bank data. */
  }
  window.dispatchEvent(new Event("vesta-display-change"));
}
export function displaySnapshot() {
  return JSON.stringify(readDisplay());
}
export const serverDisplaySnapshot = () => JSON.stringify(defaultDisplay);
export function subscribeDisplay(change: () => void) {
  for (const name of [
    "vesta-display-change",
    "vesta-profile-change",
    "storage",
  ])
    window.addEventListener(name, change);
  return () => {
    for (const name of [
      "vesta-display-change",
      "vesta-profile-change",
      "storage",
    ])
      window.removeEventListener(name, change);
  };
}
