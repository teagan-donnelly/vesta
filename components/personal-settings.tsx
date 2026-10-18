"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useFinancial } from "./financial-provider";
import { Panel, Button, Notice } from "./ui";
import { useAssistantLanguage } from "@/lib/assistant-language";
import {
  cacheDisplay,
  displaySnapshot,
  serverDisplaySnapshot,
  subscribeDisplay,
  type DisplayPreferences,
} from "@/lib/display-preferences";
export function DisplayPreferenceEffect() {
  const { records, recordsReady } = useFinancial();
  const snapshot = useSyncExternalStore(
    subscribeDisplay,
    displaySnapshot,
    serverDisplaySnapshot,
  );
  const preference = records.find(
    (r) => r.kind === "preferences" && r.id === "display",
  )?.notes;
  useEffect(() => {
    if (recordsReady && preference) {
      try {
        const parsed = JSON.parse(preference);
        if (
          ["light", "dark", "system"].includes(parsed.appearance) &&
          ["short", "MM/DD/YYYY", "DD/MM/YYYY", "ISO"].includes(
            parsed.dateFormat,
          )
        )
          cacheDisplay(parsed);
      } catch {
        /* Invalid preference never prevents loading. */
      }
    }
  }, [preference, recordsReady]);
  useEffect(() => {
    const value = JSON.parse(snapshot) as DisplayPreferences;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        value.appearance === "system"
          ? media.matches
            ? "dark"
            : "light"
          : value.appearance;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [snapshot]);
  return null;
}
export function PersonalSettings() {
  const { data, mode, customer, records, recordsReady, saveRecord } =
    useFinancial();
  const [tab, setTab] = useState("Profile"),
    [message, setMessage] = useState("");
  const [language, setLanguage] = useAssistantLanguage();
  const snapshot = useSyncExternalStore(
    subscribeDisplay,
    displaySnapshot,
    serverDisplaySnapshot,
  );
  const preferences = JSON.parse(snapshot) as DisplayPreferences;
  async function saveDisplay(next: DisplayPreferences) {
    cacheDisplay(next);
    setMessage("Saved on this device.");
    if (recordsReady)
      try {
        await saveRecord({
          id: "display",
          kind: "preferences",
          label: "Display preferences",
          notes: JSON.stringify(next),
        });
        setMessage(
          "Display preferences saved to selected planning storage and this device.",
        );
      } catch {
        setMessage(
          "Saved on this device only; planning storage could not be updated.",
        );
      }
  }
  const profileName =
    data?.customers.find((c) => c.id === data.accounts[0]?.customerId)?.name ||
    customer ||
    "Your profile";
  const notifications =
    records.find((r) => r.kind === "preferences" && r.id === "notifications")
      ?.status !== "off";
  return (
    <>
      <div className="settings-tabs">
        {["Profile", "Accounts", "Notifications", "Preferences", "Privacy"].map(
          (name) => (
            <button
              key={name}
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ),
        )}
      </div>
      <div className="two-column">
        <Panel title={tab === "Profile" ? "Profile information" : tab}>
          <div className="panel-body">
            {tab === "Profile" ? (
              <>
                <span className="profile-initials">
                  {profileName.slice(0, 2).toUpperCase()}
                </span>
                <dl className="settings-definition">
                  <div>
                    <dt>Selected profile</dt>
                    <dd>{profileName}</dd>
                  </div>
                  <div>
                    <dt>Financial source</dt>
                    <dd>
                      {mode === "nessie"
                        ? "Retrieved fictional Nessie sandbox"
                        : "Fictional Vesta demo"}
                    </dd>
                  </div>
                  <div>
                    <dt>Identity</dt>
                    <dd>Demonstration switching; no real authentication</dd>
                  </div>
                </dl>
                <p className="subtext">
                  Choose a different profile or source from the profile menu.
                  Vesta does not invent a personal email address or phone
                  number.
                </p>
              </>
            ) : tab === "Accounts" ? (
              <>
                {data?.accounts.map((account) => (
                  <div className="structured-row" key={account.id}>
                    <div>
                      <strong>{account.name}</strong>
                      <span className="subtext">
                        {account.institution} · {account.type}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="subtext">
                  Imported account ownership and balances cannot be edited here.
                </p>
                <Link href="#diagnostics" className="text-link">
                  Manage financial data connections →
                </Link>
              </>
            ) : tab === "Notifications" ? (
              <>
                <label className="saved-check">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={async (e) => {
                      try {
                        await saveRecord({
                          id: "notifications",
                          kind: "preferences",
                          label: "In-app financial alerts",
                          status: e.target.checked ? "on" : "off",
                        });
                        setMessage("In-app notification preference saved.");
                      } catch {
                        setMessage(
                          "Could not save. Review planning storage below.",
                        );
                      }
                    }}
                  />
                  <span>Show in-app financial review notifications</span>
                </label>
                <p className="subtext">
                  These alerts are based on available records. Email, SMS and
                  push delivery are not connected.
                </p>
              </>
            ) : tab === "Privacy" ? (
              <>
                <p>
                  Share only the financial context you choose. Consent is
                  enforced on the server for fictional collaborative profiles.
                </p>
                <Link className="text-link" href="/shared">
                  Manage workspace disclosure and revoke consent →
                </Link>
                <Link className="text-link" href="/assistant#preferences">
                  Manage opt-in AI memory, corrections and deletion →
                </Link>
                <Link className="text-link" href="/deadbolt">
                  Review financial separation →
                </Link>
              </>
            ) : (
              <>
                <label className="field">
                  <span>Assistant language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </label>
                <label className="field">
                  <span>Date format</span>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) =>
                      void saveDisplay({
                        ...preferences,
                        dateFormat: e.target.value,
                      })
                    }
                  >
                    {["short", "MM/DD/YYYY", "DD/MM/YYYY", "ISO"].map(
                      (value) => (
                        <option key={value} value={value}>
                          {value === "short" ? "Oct 17, 2026" : value}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <p className="subtext">
                  Display currency: USD. Currency conversion is not connected.
                </p>
              </>
            )}
          </div>
        </Panel>
        <Panel title="Appearance">
          <div className="panel-body">
            <p className="subtext">
              Choose the way Vesta feels on this device.
            </p>
            <div className="settings-tabs">
              {["light", "dark", "system"].map((appearance) => (
                <Button
                  key={appearance}
                  aria-pressed={preferences.appearance === appearance}
                  variant={
                    preferences.appearance === appearance
                      ? "primary"
                      : "secondary"
                  }
                  onClick={() =>
                    void saveDisplay({ ...preferences, appearance })
                  }
                >
                  {appearance[0].toUpperCase() + appearance.slice(1)}
                </Button>
              ))}
            </div>
            <p className="subtext">
              Preferences are scoped to the selected source and profile.
              Financial values stay unchanged.
            </p>
          </div>
        </Panel>
      </div>
      {message && (
        <Notice>
          <p role="status">{message}</p>
        </Notice>
      )}
    </>
  );
}
