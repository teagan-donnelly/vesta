"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  parseProfile,
  profileSnapshot,
  saveProfile,
  serverProfileSnapshot,
  subscribeProfile,
} from "@/lib/profile-preferences";
import type { DataSource, FinancialData, Simulation } from "@/lib/types";
import { Button, Notice, EmptyState, LoadingState } from "./ui";
import Link from "next/link";
import { ensureDemoSession } from "@/lib/demo-session-client";

type State = {
  mode: DataSource;
  setMode: (mode: DataSource) => void;
  data: FinancialData | null;
  error: string;
  loading: boolean;
  customer: string;
  setCustomer: (id: string) => void;
  setDemoProfile: (id: string) => void;
  simulation: Simulation;
  setSimulation: (value: Simulation) => void;
  reload: (preserveSnapshot?: boolean) => void;
};
const Context = createContext<State | null>(null);
export function FinancialProvider({ children }: { children: ReactNode }) {
  const preferences = useSyncExternalStore(
    subscribeProfile,
    profileSnapshot,
    serverProfileSnapshot,
  );
  const { mode, customer } = parseProfile(preferences);
  const [data, setData] = useState<FinancialData | null>(null);
  const [dataProfile, setDataProfile] = useState("");
  const [error, setError] = useState("");
  const [errorProfile, setErrorProfile] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [scenarioState, setScenarioState] = useState<{
    profile: string;
    value: Simulation;
  }>({ profile: "", value: {} });
  const simulation =
    scenarioState.profile === preferences ? scenarioState.value : {};
  const setSimulation = (value: Simulation) =>
    setScenarioState({ profile: preferences, value });
  const visibleData =
    dataProfile === preferences && data?.source === mode ? data : null;
  const visibleError = errorProfile === preferences ? error : "";
  useEffect(() => {
    const controller = new AbortController();
    (mode === "demo" && customer.startsWith("demo:")
      ? ensureDemoSession()
      : Promise.resolve()
    )
      .then(() =>
        fetch(
          `/api/financial-data?mode=${mode}&customer=${encodeURIComponent(customer)}`,
          { signal: controller.signal, cache: "no-store" },
        ),
      )
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        return result as FinancialData;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        let resolvedCustomer = customer;
        if (mode === "nessie" && !customer)
          resolvedCustomer =
            result.accounts[0]?.customerId ||
            result.customers.find((c) => c.name === "Vesta Fictional Test")
              ?.id ||
            result.customers[0]?.id ||
            "";
        setData(result);
        if (mode === "demo" && customer.startsWith("demo:"))
          setScenarioState({
            profile: JSON.stringify({ mode, customer }),
            value:
              (result as FinancialData & { planningSimulation?: Simulation })
                .planningSimulation || {},
          });
        setDataProfile(JSON.stringify({ mode, customer: resolvedCustomer }));
        setError("");
        setLoading(false);
        if (mode === "nessie" && !customer) {
          if (resolvedCustomer)
            saveProfile({ mode, customer: resolvedCustomer });
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setData(null);
          setErrorProfile(JSON.stringify({ mode, customer }));
          setError(
            e instanceof Error
              ? e.message
              : "Financial information could not be loaded.",
          );
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
    saveProfile({
      mode: value,
      customer: customer.startsWith("demo:") ? "" : customer,
    });
  }
  function setCustomer(value: string) {
    if (value === customer) return;
    clear();
    saveProfile({ mode, customer: value });
  }
  return (
    <Context.Provider
      value={{
        mode,
        setMode,
        data: visibleData,
        error: visibleError,
        loading: loading || (!visibleData && !visibleError),
        customer,
        setCustomer,
        setDemoProfile: (id) => {
          clear();
          saveProfile({ mode: "demo", customer: `demo:${id}` });
        },
        simulation,
        setSimulation,
        reload: (preserve = false) => {
          if (preserve) {
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
export function FinancialLoading() {
  const { error } = useFinancial();
  return error ? (
    <EmptyState
      title="Your financial information is unavailable"
      description="Your selected profile is retained. Retry the connection to continue."
    />
  ) : (
    <LoadingState />
  );
}
export function DataStatus() {
  const { data, error, loading, reload, mode, customer, setCustomer } =
    useFinancial();
  return (
    <>
      {loading && data && (
        <p role="status" className="refresh-status">
          Updating financial information...
        </p>
      )}
      {error && (
        <div role="alert">
          <Notice tone="risk">
            <div>
              <strong>Unable to load your financial information</strong>
              <p>
                Try again or{" "}
                <Link href="/settings">review the connection details</Link>.
              </p>
            </div>
            <div className="inline-actions">
              {mode === "nessie" && customer && (
                <Button variant="quiet" onClick={() => setCustomer("")}>
                  Reset profile selection
                </Button>
              )}
              <Button variant="secondary" onClick={() => reload()}>
                Try again
              </Button>
            </div>
          </Notice>
        </div>
      )}
      {data?.warnings.some((w) => /pending|Loans are displayed/i.test(w)) && (
        <Notice tone="caution">
          <p>
            Some activity is excluded from this cash forecast.{" "}
            <Link href="/settings">Review data coverage</Link> before relying on
            the projection.
          </p>
        </Notice>
      )}
    </>
  );
}
