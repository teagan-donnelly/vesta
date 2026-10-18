"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useFinancial } from "./financial-provider";
import { Button, Notice } from "./ui";
import { shift } from "@/lib/analysis";
import {
  validateRecord,
  type PersonalRecord,
  type RecordKind,
} from "@/lib/management";
type Field = {
  key: keyof PersonalRecord;
  label: string;
  type?: string;
  options?: string[];
  optional?: boolean;
};
const fields: Partial<Record<RecordKind, Field[]>> = {
  transaction: [
    {
      key: "amountCents",
      label: "Amount (USD; negative for spending)",
      type: "money",
    },
    { key: "date", label: "Transaction date", type: "date" },
    { key: "accountId", label: "Account", type: "account" },
    { key: "category", label: "Category" },
  ],
  annotation: [{ key: "category", label: "Your category", optional: true }],
  subscription: [
    { key: "amountCents", label: "Charge (USD)", type: "money" },
    {
      key: "cadence",
      label: "Billing cycle",
      options: ["monthly", "weekly", "annual"],
    },
    { key: "date", label: "Next billing date", type: "date" },
    { key: "accountId", label: "Paying account", type: "account" },
    {
      key: "status",
      label: "Tracking status",
      options: ["active", "canceled"],
    },
  ],
  score: [
    {
      key: "score",
      label: "Manually recorded score (300–850)",
      type: "number",
    },
    { key: "date", label: "Date recorded", type: "date" },
  ],
  credit: [
    {
      key: "category",
      label: "Account type",
      options: ["Revolving", "Installment"],
    },
    { key: "balanceCents", label: "Outstanding balance (USD)", type: "money" },
    {
      key: "limitCents",
      label: "Revolving credit limit (USD)",
      type: "money",
      optional: true,
    },
    {
      key: "openedDate",
      label: "Opened date (if known)",
      type: "date",
      optional: true,
    },
    {
      key: "date",
      label: "Payment observation date",
      type: "date",
      optional: true,
    },
    {
      key: "paymentStatus",
      label: "Recorded payment status",
      options: ["Unknown", "On time", "Late"],
    },
  ],
  goal: [
    { key: "targetCents", label: "Savings target (USD)", type: "money" },
    { key: "balanceCents", label: "Starting savings (USD)", type: "money" },
    { key: "date", label: "Target date", type: "date" },
    { key: "category", label: "Goal type", options: ["General", "Emergency"] },
  ],
  contribution: [
    { key: "referenceId", label: "Savings goal", type: "goal" },
    { key: "amountCents", label: "Contribution (USD)", type: "money" },
    { key: "date", label: "Date contributed", type: "date" },
  ],
  budget: [
    { key: "category", label: "Spending category (match your transactions)" },
    { key: "amountCents", label: "Monthly budget (USD)", type: "money" },
    { key: "date", label: "Budget month (choose any day)", type: "date" },
  ],
  holding: [
    {
      key: "category",
      label: "Asset class",
      options: ["Stocks", "ETFs", "Crypto", "Bonds", "Cash", "Other"],
    },
    { key: "quantity", label: "Units held", type: "quantity" },
    { key: "priceCents", label: "Manual value per unit (USD)", type: "money" },
    { key: "costCents", label: "Total cost basis (USD)", type: "money" },
    { key: "date", label: "Valuation date", type: "date" },
  ],
  policy: [
    {
      key: "category",
      label: "Policy type",
      options: ["Health", "Auto", "Renters", "Home", "Life", "Other"],
    },
    { key: "amountCents", label: "Monthly premium (USD)", type: "money" },
    { key: "date", label: "Renewal date", type: "date" },
    {
      key: "status",
      label: "Self-reported status",
      options: ["active", "expired", "review"],
    },
  ],
  contact: [{ key: "category", label: "Relationship / role" }],
  resource: [
    {
      key: "category",
      label: "Resource type",
      options: ["Document", "Checklist", "Resource"],
    },
    { key: "status", label: "Readiness", options: ["needed", "ready"] },
  ],
};
export function RecordButton({
  kind,
  record,
  label,
  defaults,
}: {
  kind: RecordKind;
  record?: PersonalRecord;
  label?: string;
  defaults?: Partial<PersonalRecord>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={record ? "quiet" : "primary"}
        onClick={() => setOpen(true)}
      >
        {!record && <Plus size={15} />}
        {label || (record ? "Edit" : `Add ${kind}`)}
      </Button>
      {open && (
        <RecordEditor
          kind={kind}
          record={record}
          defaults={defaults}
          close={() => setOpen(false)}
        />
      )}
    </>
  );
}
function RecordEditor({
  kind,
  record,
  defaults,
  close,
}: {
  kind: RecordKind;
  record?: PersonalRecord;
  defaults?: Partial<PersonalRecord>;
  close: () => void;
}) {
  const {
    data,
    records,
    saveRecord,
    deleteRecord,
    recordsError,
    recordsStorage,
  } = useFinancial();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initial = { ...defaults, ...record };
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className="record-dialog" onCancel={close}>
      <header>
        <div>
          <span className="eyebrow">PERSONAL PLANNING</span>
          <h2>
            {record ? "Edit" : "Add"}{" "}
            {kind === "annotation" ? "transaction details" : kind}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close editor"
          onClick={close}
        >
          <X size={20} />
        </button>
      </header>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const form = new FormData(e.currentTarget);
            const next: Record<string, unknown> = {
              ...initial,
              id: record?.id || crypto.randomUUID(),
              kind,
              label: form.get("label"),
              notes: form.get("notes") || "",
            };
            for (const field of fields[kind] || []) {
              const raw = String(form.get(field.key) || "");
              next[field.key] =
                raw === ""
                  ? undefined
                  : field.type === "money"
                    ? Math.round(Number(raw) * 100)
                    : ["number", "quantity"].includes(field.type || "")
                      ? Number(raw)
                      : raw;
            }
            await saveRecord(validateRecord(next));
            close();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "The record was not saved.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="subtext">
          {kind === "annotation"
            ? "Only your Vesta category and note change. The imported banking record is preserved."
            : "Self-reported planning information. This does not move money or change bank records."}
        </p>
        {kind === "subscription" && (
          <p className="subtext">
            Marking canceled changes Vesta’s estimates; it does not cancel the
            actual service. Existing scheduled bank payments remain due.
          </p>
        )}
        <div className="editor-fields">
          <label className="field">
            <span>
              {kind === "contact"
                ? "Contact name"
                : kind === "policy"
                  ? "Policy / provider name"
                  : "Name"}
            </span>
            <input
              name="label"
              required
              maxLength={200}
              defaultValue={initial.label || ""}
            />
          </label>
          {(fields[kind] || []).map((field) => {
            const options =
              field.type === "account"
                ? data?.accounts.map((a) => ({ id: a.id, name: a.name }))
                : field.type === "goal"
                  ? records
                      .filter((r) => r.kind === "goal")
                      .map((r) => ({ id: r.id, name: r.label }))
                  : field.options?.map((name) => ({ id: name, name }));
            const value = initial[field.key];
            return (
              <label className="field" key={field.key}>
                <span>{field.label}</span>
                {options ? (
                  <select
                    aria-label={field.label}
                    name={field.key}
                    defaultValue={String(value || options[0]?.id || "")}
                    required={!field.optional}
                  >
                    {!options.length && (
                      <option value="">No records available</option>
                    )}
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label={field.label}
                    name={field.key}
                    required={!field.optional}
                    type={
                      ["money", "quantity"].includes(field.type || "")
                        ? "number"
                        : field.type || "text"
                    }
                    step={
                      field.type === "money"
                        ? "0.01"
                        : field.type === "quantity"
                          ? "0.0001"
                          : field.type === "number"
                            ? "1"
                            : undefined
                    }
                    defaultValue={
                      value === undefined
                        ? field.type === "date"
                          ? !field.optional && data?.asOf
                            ? shift(
                                data.asOf,
                                kind === "subscription"
                                  ? 1
                                  : kind === "goal"
                                    ? 30
                                    : kind === "policy"
                                      ? 365
                                      : 0,
                              )
                            : ""
                          : ""
                        : field.type === "money"
                          ? Number(value) / 100
                          : String(value)
                    }
                    maxLength={200}
                  />
                )}
              </label>
            );
          })}
          <label className="field editor-full">
            <span>
              {kind === "contact"
                ? "Phone / email / contact instructions"
                : "Notes"}
            </span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              defaultValue={initial.notes || ""}
            />
          </label>
        </div>
        {(error || recordsError) && (
          <Notice tone="caution">
            <p role="alert">{error || recordsError}</p>
          </Notice>
        )}
        <p className="subtext">
          Storage:{" "}
          {recordsStorage ||
            "not connected; choose planning storage in Settings"}
          .
        </p>
        <footer>
          {record && (
            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Delete this manually tracked ${kind}? Imported bank records are unaffected.`,
                  )
                )
                  return;
                setBusy(true);
                try {
                  await deleteRecord(record.id);
                  close();
                } catch {
                  setError("Could not delete this record.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete manual record
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={busy} type="submit">
            {busy ? "Saving…" : "Confirm and save"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
