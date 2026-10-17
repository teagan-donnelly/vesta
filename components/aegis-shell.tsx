"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChartNoAxesCombined,
  CreditCard,
  ShieldCheck,
  ShieldPlus,
  WalletCards,
  Settings2,
  Files,
  Menu,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { DataStatus, useFinancial } from "./financial-provider";
import { Badge, Button } from "./ui";
const navItems = [
  { href: "/", label: "Overview", icon: WalletCards },
  { href: "/protect", label: "Protect", icon: ShieldCheck },
  { href: "/domino", label: "Domino", icon: ChartNoAxesCombined },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/deadbolt", label: "Deadbolt", icon: ShieldPlus },
  { href: "/continuity", label: "Continuity", icon: Files },
  { href: "/settings", label: "Settings", icon: Settings2 },
];
export function AegisShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const { mode, setMode, data, customer, setCustomer, loading, reload } =
    useFinancial();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeControl = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1000px)");
    const onChange = () => {
      if (media.matches) setMobileOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  const profile =
    data?.customers.find((c) => c.id === customer) ||
    data?.customers.find((c) => c.id === data.accounts[0]?.customerId) ||
    data?.customers[0];
  const name = profile?.name || "Your workspace";
  function closeMenu() {
    setMobileOpen(false);
    requestAnimationFrame(() => menuTrigger.current?.focus());
  }
  return (
    <div className="application">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {mobileOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={closeMenu}
        />
      )}
      <aside
        id="workspace-navigation"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Workspace navigation"
        className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeMenu();
          if (e.key === "Tab" && mobileOpen) {
            const items = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>("a,button"),
            );
            const first = items[0],
              last = items.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="brand">
          <Link
            href="/"
            aria-label="Vesta overview"
            onClick={() => setMobileOpen(false)}
          >
            <Image
              className="brand-logo"
              src="/brand/vesta-goddess.png"
              alt="Vesta — goddess holding a torch beside the VESTA wordmark"
              width={1774}
              height={887}
              preload
              unoptimized
            />
          </Link>
          <button
            className="icon-button mobile-close"
            ref={closeControl}
            aria-label="Close navigation"
            onClick={closeMenu}
          >
            <X size={18} />
          </button>
        </div>
        <p className="nav-label">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar" aria-hidden="true">
            {name
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <strong>{name}</strong>
            <span>Personal workspace</span>
          </div>
        </div>
      </aside>
      <div className="app-main" inert={mobileOpen}>
        <header className="workspace-bar">
          <div className="workspace-breadcrumb">
            <button
              ref={menuTrigger}
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              aria-expanded={mobileOpen}
              onClick={() => {
                setMobileOpen(true);
                requestAnimationFrame(() => closeControl.current?.focus());
              }}
            >
              <Menu size={19} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} aria-hidden="true" />
            <strong>{title}</strong>
          </div>
          <div className="workspace-controls">
            {mode === "nessie" && !!data?.customers.length && (
              <select
                aria-label="Financial profile"
                className="compact-select profile-select"
                value={customer || profile?.id || ""}
                onChange={(e) => setCustomer(e.target.value)}
              >
                {data.customers.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Data source"
              className="compact-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as "demo" | "nessie")}
            >
              <option value="demo">Demo Mode</option>
              <option value="nessie">Nessie Sandbox</option>
            </select>
            <Button
              variant="quiet"
              title="Refresh financial information"
              aria-label="Refresh financial information"
              disabled={loading}
              onClick={() => reload(true)}
            >
              <RefreshCw size={15} className={loading ? "is-refreshing" : ""} />
            </Button>
          </div>
        </header>
        <main id="main-content" className="page-content" tabIndex={-1}>
          <header className="page-heading">
            <div>
              <div className="eyebrow">PERSONAL FINANCE</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="page-actions">
              {actions}
              <span
                title={
                  mode === "nessie"
                    ? "Financial records retrieved from the Nessie banking sandbox. The Vesta test profile contains fictional activity."
                    : "All balances and activity in Demo Mode are fictional."
                }
              >
                <Badge>
                  {mode === "nessie" ? "Sandbox data" : "Fictional demo"}
                </Badge>
                <span className="sr-only">
                  {mode === "nessie"
                    ? "Nessie sandbox records are fictional, not real bank activity."
                    : "All demonstration records are fictional."}
                </span>
              </span>
            </div>
          </header>
          <DataStatus />
          {children}
          <footer className="workspace-footer">
            <span>Vesta · Financial clarity, before it matters.</span>
            <span>
              {data ? `As of ${data.asOf}` : "Financial intelligence"}
              <span aria-hidden="true"> · </span>
              <Link href="/settings">Data & privacy</Link>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
