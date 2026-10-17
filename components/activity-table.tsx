"use client";
import { useState } from "react";
import { Badge, Button, EmptyState } from "./ui";
import { formatCurrency, classify } from "@/lib/analysis";
import type { FinancialData } from "@/lib/types";
export function dateLabel(value: string, year = false) {
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        ...(year ? { year: "numeric" } : {}),
        timeZone: "UTC",
      }).format(date)
    : "Date unavailable";
}
export function ActivityTable({
  data,
  limit = 8,
  filterable = false,
}: {
  data: FinancialData;
  limit?: number;
  filterable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(limit);
  const rows = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((t) =>
      `${t.merchant} ${t.category} ${t.recordType || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  const labels = {
    subscription: "Subscription",
    bill: "Recurring bill",
    debt: "Debt payment",
    income: "Income",
    purchase: "Spending",
  };
  return (
    <>
      {filterable && (
        <div className="table-toolbar">
          <input
            aria-label="Search activity"
            className="search-input"
            type="search"
            placeholder="Search descriptions or categories"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(limit);
            }}
          />
          <span className="muted" style={{ fontSize: 14 }}>
            {rows.length} records
          </span>
        </div>
      )}
      {!rows.length ? (
        <EmptyState
          title={query ? "No matching activity" : "No activity to show yet"}
          description={
            query
              ? "Try a different description or category."
              : "Your account is connected. Activity will appear here when records are available from the selected data source."
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">
              Financial activity from the selected data source
            </caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col">Account</th>
                <th scope="col" className="align-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, visible).map((t) => (
                <tr key={`${t.accountId}:${t.id}`}>
                  <td>{dateLabel(t.date)}</td>
                  <td className="table-description">
                    <strong style={{ fontWeight: 500 }}>
                      {t.merchant || "Description not provided"}
                    </strong>
                    <span className="subtext">
                      {data.source === "nessie"
                        ? `Nessie ${t.recordType || "record"}`
                        : t.description}
                      {t.pending ? " · Pending" : ""}
                    </span>
                  </td>
                  <td>
                    <Badge>{labels[classify(t)]}</Badge>
                  </td>
                  <td>
                    {data.accounts.find((a) => a.id === t.accountId)?.name ||
                      "Account not provided"}
                  </td>
                  <td
                    className={`align-right amount ${t.amountCents > 0 ? "positive" : ""}`}
                  >
                    {t.amountCents > 0 ? "+" : ""}
                    {formatCurrency(t.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!!rows.length && (
        <div className="table-footer">
          <span>
            Showing {Math.min(rows.length, visible)} of {rows.length} records
          </span>
          {visible < rows.length && (
            <Button variant="quiet" onClick={() => setVisible((v) => v + 20)}>
              Show more
            </Button>
          )}
        </div>
      )}
    </>
  );
}
