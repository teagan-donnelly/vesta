"use client";
import Link from "next/link";
import { planningSections } from "@/lib/navigation";
export function PlanNavigation({ section }: { section: string }) {
  return (
    <nav className="section-navigation" aria-label="Plan Ahead sections">
      {planningSections.map((s) => (
        <Link
          key={s.id}
          href={s.href}
          aria-current={section === s.id ? "page" : undefined}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
