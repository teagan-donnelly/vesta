"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChartNoAxesCombined,
  ShieldCheck,
  WalletCards,
  Files,
  Menu,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { DataStatus, useFinancial } from "./financial-provider";
import { Button } from "./ui";
import { ProfileMenu } from "./profile-menu";
import { PlanNavigation } from "./plan-navigation";
import { mainDestinations, destinationFor, sectionFor } from "@/lib/navigation";
const icons = [WalletCards, Files, ChartNoAxesCombined, ShieldCheck];
const navItems = mainDestinations.map((item, i) => ({
  ...item,
  icon: icons[i],
}));
export function AegisShell({
  title,
  subtitle,
  children,
  actions,
  planSection,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
  planSection?: string;
}) {
  const pathname = usePathname();
  const { mode, data, customer, loading, reload } = useFinancial();
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
  const name =
    mode === "demo" && customer.startsWith("demo:")
      ? customer.slice(5, 6).toUpperCase() + customer.slice(6)
      : profile?.name || "Your profile";
  const destination = destinationFor(pathname);
  const displayTitle =
    pathname === "/"
      ? "Home"
      : destination?.href === "/plan"
        ? "Plan Ahead"
        : pathname === "/shared"
          ? "Shared Finances"
          : pathname === "/deadbolt"
            ? "Financial Separation"
            : pathname === "/continuity"
              ? "Emergency Planning"
              : title;
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
            aria-label="Vesta Home"
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
              className={`nav-item ${destination?.href === href ? "active" : ""}`}
              aria-current={destination?.href === href ? "page" : undefined}
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
            <strong>{displayTitle}</strong>
          </div>
          <div className="workspace-controls">
            <details className="source-disclosure">
              <summary className="source-indicator">
                {mode === "nessie" ? "Nessie sandbox" : "Demo data"}
              </summary>
              <p>
                {mode === "nessie"
                  ? "These fictional banking records are retrieved from Nessie. Missing history is never replaced with demo transactions."
                  : "These balances and activities are fictional. Demo profile switching is not authentication."}{" "}
                <Link href="/settings">Data & privacy settings</Link>
              </p>
            </details>
            <ProfileMenu name={name} />
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
              <div className="eyebrow">
                {destination?.href === "/shared"
                  ? "SHARED PLANNING"
                  : pathname === "/assistant"
                    ? "PERSONAL GUIDANCE"
                    : "PERSONAL FINANCE"}
              </div>
              <h1>{displayTitle}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="page-actions">{actions}</div>
          </header>
          {destination?.href === "/plan" && (
            <PlanNavigation
              section={planSection || sectionFor(pathname, null)}
            />
          )}
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
