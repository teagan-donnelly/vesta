import type { DataSource } from "./types";
export interface ProfilePreferences {
  mode: DataSource;
  customer: string;
}
export const PROFILE_KEY = "vesta.profile.v1";
export const DEFAULT_PROFILE = '{"mode":"demo","customer":""}';
export function parseProfile(value: string | null): ProfilePreferences {
  try {
    const raw = JSON.parse(value || DEFAULT_PROFILE);
    return {
      mode: raw?.mode === "nessie" ? "nessie" : "demo",
      customer:
        typeof raw?.customer === "string" && raw.customer.length <= 200
          ? raw.customer
          : "",
    };
  } catch {
    return { mode: "demo", customer: "" };
  }
}
let memory = DEFAULT_PROFILE;
export function profileSnapshot() {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    return JSON.stringify(
      parseProfile(window.localStorage.getItem(PROFILE_KEY) || memory),
    );
  } catch {
    return memory;
  }
}
export const serverProfileSnapshot = () => DEFAULT_PROFILE;
export function saveProfile(value: ProfilePreferences) {
  memory = JSON.stringify(parseProfile(JSON.stringify(value)));
  try {
    window.localStorage.setItem(PROFILE_KEY, memory);
  } catch {
    /* Session preferences still work when storage is unavailable. */
  }
  window.dispatchEvent(new Event("vesta-profile-change"));
}
export function subscribeProfile(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("vesta-profile-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("vesta-profile-change", listener);
  };
}
