"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { useFinancial } from "./financial-provider";
import { DemoControls } from "./demo-controls";
import { useAssistantLanguage } from "@/lib/assistant-language";
export function ProfileMenu({ name }: { name: string }) {
  const { mode, setMode, data, customer, setCustomer } = useFinancial();
  const [language, setLanguage] = useAssistantLanguage();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node))
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={menu}
      className="profile-menu"
      onKeyDown={(e) => {
        if (e.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`Profile and settings: ${name}`}>
        <span className="profile-name">{name}</span>
        <Settings2 size={19} aria-hidden="true" />
      </summary>
      <div className="profile-popover">
        <strong>Profile & settings</strong>
        <p className="subtext">
          Demo profiles are fictional perspectives, not authentication.
        </p>
        <DemoControls />
        <label className="field">
          <span>Financial data</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "demo" | "nessie")}
          >
            <option value="demo">Demo data</option>
            <option value="nessie">Nessie sandbox</option>
          </select>
        </label>
        {mode === "nessie" && !!data?.customers.length && (
          <label className="field">
            <span>Sandbox customer</span>
            <select
              value={customer || data.customers[0].id}
              onChange={(e) => setCustomer(e.target.value)}
            >
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          <span>Assistant language / Idioma</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
        <nav
          aria-label="Profile tools"
          onClick={() => {
            if (menu.current) menu.current.open = false;
          }}
        >
          <Link href="/settings">Data & privacy settings</Link>
          <Link
            href="/assistant#preferences"
            onClick={() => {
              const panel = document.getElementById("preferences");
              if (panel instanceof HTMLDetailsElement) panel.open = true;
            }}
          >
            Memory & assistant settings
          </Link>
          <Link href="/continuity">Emergency Planning</Link>
          <Link href="/settings#diagnostics">
            Developer diagnostics & sandbox setup
          </Link>
        </nav>
      </div>
    </details>
  );
}
