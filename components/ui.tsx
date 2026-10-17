import type { ButtonHTMLAttributes, ReactNode } from "react";
import { formatCurrency } from "@/lib/analysis";
export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props} />
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "risk" | "caution" | "brand";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Amount({
  cents,
  signed = false,
  className = "",
}: {
  cents: number;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`amount ${signed ? (cents > 0 ? "positive" : cents < 0 ? "negative" : "") : ""} ${className}`}
    >
      {signed && cents > 0 ? "+" : ""}
      {formatCurrency(cents)}
    </span>
  );
}
export function MetricGrid({
  items,
}: {
  items: {
    label: string;
    value: ReactNode;
    note?: ReactNode;
    tone?: "negative" | "positive";
  }[];
}) {
  return (
    <dl className="metric-grid">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd className={item.tone}>{item.value}</dd>
          {item.note && <p>{item.note}</p>}
        </div>
      ))}
    </dl>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Loading financial information"
      className="loading-layout"
    >
      <div className="skeleton skeleton-metrics" />
      <div className="skeleton skeleton-chart" />
      <div className="skeleton skeleton-table" />
      <span className="sr-only">Loading financial information</span>
    </div>
  );
}
export function Notice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "caution" | "risk" | "positive";
}) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}
