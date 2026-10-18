"use client";
import { useState, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { Download, ArrowDownUp } from "lucide-react";
import { AegisShell } from "@/components/aegis-shell";
import {
  useFinancial,
  FinancialLoading,
} from "@/components/financial-provider";
import {
  Panel,
  MetricGrid,
  Amount,
  Badge,
  Button,
  EmptyState,
} from "@/components/ui";
import { RecordButton } from "@/components/record-editor";
import { dateLabel } from "@/components/activity-table";
import { alertsFor } from "@/lib/analysis";
const subscribeSearch = (change: () => void) => {
  window.addEventListener("popstate", change);
  return () => window.removeEventListener("popstate", change);
};
export default function TransactionsPage() {
  const search = useSyncExternalStore(
    subscribeSearch,
    () => window.location.search,
    () => "",
  );
  return (
    <TransactionsView
      key={search}
      initialQuery={new URLSearchParams(search).get("q") || ""}
    />
  );
}
function TransactionsView({ initialQuery }: { initialQuery: string }) {
  const { data, records } = useFinancial();
  const [query, setQuery] = useState(initialQuery);
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("date");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState("");
  const rows = useMemo(
    () =>
      (data?.transactions || [])
        .filter(
          (t) =>
            `${t.merchant} ${t.category} ${t.description}`
              .toLowerCase()
              .includes(query.toLowerCase()) &&
            (!account || t.accountId === account) &&
            (!category || t.category === category) &&
            (!type ||
              (type === "income"
                ? t.amountCents > 0
                : type === "expense"
                  ? t.amountCents < 0
                  : t.provenance === "manual")) &&
            (!from || t.date >= from) &&
            (!to || t.date <= to),
        )
        .sort((a, b) => {
          const comparison =
            sort === "amount"
              ? a.amountCents - b.amountCents
              : sort === "merchant"
                ? a.merchant.localeCompare(b.merchant)
                : a.date.localeCompare(b.date);
          return ascending ? comparison : -comparison;
        }),
    [data, query, account, category, type, from, to, sort, ascending],
  );
  if (!data)
    return (
      <AegisShell
        title="Transactions"
        subtitle="View and manage the activity behind your finances."
      >
        <FinancialLoading />
      </AegisShell>
    );
  const completed = rows.filter((t) => !t.pending && t.date <= data.asOf),
    income = completed.reduce((s, t) => s + Math.max(0, t.amountCents), 0),
    expenses = completed.reduce((s, t) => s - Math.min(0, t.amountCents), 0);
  const flags = alertsFor(data);
  const selected = data.transactions.find((t) => t.id === detail);
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 15) - 1),
  );
  function exportCsv() {
    const cell = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
    const content = [
      "Date,Merchant,Category,Amount USD,Account,Source,Notes",
      ...rows.map((t) =>
        [
          t.date,
          t.merchant,
          t.category,
          (t.amountCents / 100).toFixed(2),
          data!.accounts.find((a) => a.id === t.accountId)?.name || t.accountId,
          t.provenance === "manual"
            ? "Manual Vesta entry"
            : data!.source === "nessie"
              ? "Retrieved Nessie sandbox"
              : "Fictional demo",
          t.description,
        ]
          .map((value, index) => (index === 3 ? `"${value}"` : cell(value)))
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `vesta-activity-${data!.asOf}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <AegisShell
      title="Transactions"
      subtitle="View and manage the activity behind your finances."
      actions={
        <>
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={15} />
            Export CSV
          </Button>
          <RecordButton kind="transaction" label="Add transaction" />
        </>
      }
    >
      <nav className="context-links">
        <Link href="/">Dashboard</Link>
        <Link href="/transactions" aria-current="page">
          Transactions
        </Link>
        <Link href="/continuity">Emergency</Link>
      </nav>
      <MetricGrid
        items={[
          {
            label: "Recorded income",
            value: <Amount cents={income} />,
            note: "Completed records matching your filters",
          },
          { label: "Recorded expenses", value: <Amount cents={expenses} /> },
          {
            label: "Net cash flow",
            value: <Amount cents={income - expenses} />,
          },
          {
            label: "Financial alerts",
            value: flags.length,
            note: "Review signals, not fraud determinations",
          },
        ]}
      />
      <Panel
        className="section-gap"
        title="Your activity"
        description="Imported records are preserved. Vesta annotations and manual entries are tracked separately."
      >
        <div className="transaction-filters">
          <input
            type="search"
            aria-label="Search transactions"
            placeholder="Search merchant, category or note"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Filter account"
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All accounts</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All categories</option>
            {[...new Set(data.transactions.map((t) => t.category))]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
          <select
            aria-label="Filter transaction type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
            <option value="manual">Manual entries</option>
          </select>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                Transactions matching your filters
              </caption>
              <thead>
                <tr>
                  {[
                    ["date", "Date"],
                    ["merchant", "Merchant"],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        className="sort-button"
                        onClick={() => {
                          setAscending(sort === key ? !ascending : false);
                          setSort(key);
                        }}
                      >
                        {label}
                        <ArrowDownUp size={12} />
                      </button>
                    </th>
                  ))}
                  <th>Category</th>
                  <th>
                    <button
                      className="sort-button"
                      onClick={() => {
                        setAscending(sort === "amount" ? !ascending : false);
                        setSort("amount");
                      }}
                    >
                      Amount
                      <ArrowDownUp size={12} />
                    </button>
                  </th>
                  <th>Account</th>
                  <th>Source</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice(currentPage * 15, currentPage * 15 + 15)
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{dateLabel(t.date)}</td>
                      <td>
                        <span className="merchant-cell">
                          <span className="merchant-monogram">
                            {t.merchant[0]}
                          </span>
                          <strong>{t.merchant}</strong>
                        </span>
                        {t.pending && <Badge>Pending / expected</Badge>}
                      </td>
                      <td>{t.category}</td>
                      <td>
                        <Amount cents={t.amountCents} signed />
                      </td>
                      <td>
                        {data.accounts.find((a) => a.id === t.accountId)?.name}
                      </td>
                      <td>
                        <Badge>
                          {t.provenance === "manual"
                            ? "Manual"
                            : data.source === "nessie"
                              ? "Nessie sandbox"
                              : "Fictional demo"}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="quiet"
                          onClick={() => setDetail(detail === t.id ? "" : t.id)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No matching transactions"
            description="Change your filters or add a clearly labeled manual entry."
          />
        )}
        <div className="pagination">
          <span>
            {rows.length} records · page {currentPage + 1} of{" "}
            {Math.max(1, Math.ceil(rows.length / 15))}
          </span>
          <Button
            variant="quiet"
            disabled={!currentPage}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Button
            variant="quiet"
            disabled={(currentPage + 1) * 15 >= rows.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </Panel>
      {selected && (
        <Panel
          className="section-gap"
          title={selected.merchant}
          action={
            <Button variant="quiet" onClick={() => setDetail("")}>
              Close details
            </Button>
          }
        >
          <div className="panel-body">
            <p>
              <Amount cents={selected.amountCents} signed /> ·{" "}
              {dateLabel(selected.date, true)} · {selected.category}
            </p>
            <p className="subtext">{selected.description}</p>
            <p className="subtext">
              {flags.find((f) => f.id === `alert-${selected.id}`)?.reason}
            </p>
            {selected.provenance === "manual" ? (
              <RecordButton
                kind="transaction"
                record={records.find((r) => `manual:${r.id}` === selected.id)}
              />
            ) : (
              <RecordButton
                kind="annotation"
                label="Edit Vesta category & note"
                record={records.find(
                  (r) =>
                    r.kind === "annotation" && r.referenceId === selected.id,
                )}
                defaults={{
                  referenceId: selected.id,
                  label: selected.merchant,
                  category: selected.category,
                  notes: selected.description,
                }}
              />
            )}
          </div>
        </Panel>
      )}
    </AegisShell>
  );
}
