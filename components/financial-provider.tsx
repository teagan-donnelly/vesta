"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DataSource, FinancialData, Simulation } from "@/lib/types";
import Link from "next/link";

type State = {
  mode: DataSource;
  setMode: (mode: DataSource) => void;
  data: FinancialData | null;
  error: string;
  loading: boolean;
  customer: string;
  setCustomer: (id: string) => void;
  simulation: Simulation;
  setSimulation: (value: Simulation) => void;
  reload: (preserveSnapshot?: boolean) => void;
};
const Context = createContext<State | null>(null);
export function FinancialProvider({ children }: { children: ReactNode }) {
  const [mode, setModeValue] = useState<DataSource>("demo");
  const [customer, setCustomerValue] = useState("");
  const [data, setData] = useState<FinancialData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [simulation, setSimulation] = useState<Simulation>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/financial-data?mode=${mode}&customer=${encodeURIComponent(customer)}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setData(null);
          setError(e.message || "Data unavailable.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [mode, customer, version]);
  function clear() {
    setData(null);
    setError("");
    setLoading(true);
    setSimulation({});
  }
  function setMode(value: DataSource) {
    if (value === mode) return;
    clear();
    setCustomerValue("");
    setModeValue(value);
  }
  function setCustomer(value: string) {
    clear();
    setCustomerValue(value);
  }
  return (
    <Context.Provider
      value={{
        mode,
        setMode,
        data,
        error,
        loading,
        customer,
        setCustomer,
        simulation,
        setSimulation,
        reload: (preserveSnapshot = false) => {
          if (preserveSnapshot) {
            setError("");
            setLoading(true);
            setSimulation({});
          } else clear();
          setVersion((v) => v + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useFinancial() {
  const value = useContext(Context);
  if (!value) throw new Error("FinancialProvider missing");
  return value;
}
export function DataStatus() {
  const { error, loading, data, reload } = useFinancial();
  return (
    <>
      {loading && (
        <p role="status" className="mb-4 rounded-xl bg-white p-4">
          Loading financial records…
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-orange-50 p-4">
          {error}{" "}
          <button onClick={() => reload()} className="underline">
            Retry
          </button>
        </div>
      )}
      {data?.warnings.map((w) => (
        <p
          key={w}
          className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
        >
          {w}
        </p>
      ))}
      {data && data.source === "nessie" && (
        <p className="mb-4 text-sm">
          <Link href="/settings" className="text-sky-700 underline">
            Preview a fictional sandbox scenario in Settings
          </Link>
          . Records are created only after explicit confirmation on localhost.
        </p>
      )}
    </>
  );
}
