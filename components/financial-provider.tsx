"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
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
import { applyPersonalRecords, type PersonalRecord } from "@/lib/management";

type State = {
  records: PersonalRecord[];
  recordsStorage: string;
  recordsError: string;
  recordsReady: boolean;
  saveRecord: (record: PersonalRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
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
  const [recordState, setRecordState] = useState<{
    profile: string;
    records: PersonalRecord[];
    storage: string;
    error: string;
    ready: boolean;
  }>({ profile: "", records: [], storage: "", error: "", ready: false });
  const activeProfile = useRef(preferences);
  const recordRevision = useRef(0);
  const recordQueue = useRef(Promise.resolve());
  const records = useMemo(
    () => (recordState.profile === preferences ? recordState.records : []),
    [recordState, preferences],
  );
  useEffect(() => {
    activeProfile.current = preferences;
    const controller = new AbortController();
    const revision = recordRevision.current;
    if (mode === "nessie" && !customer) return () => controller.abort();
    void ensureDemoSession()
      .then(() =>
        fetch(
          `/api/records?mode=${mode}&customer=${encodeURIComponent(customer)}`,
          { cache: "no-store", signal: controller.signal },
        ),
      )
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            "Personal planning storage unavailable. Select storage in Settings.",
          );
        return response.json();
      })
      .then((value) => {
        if (!controller.signal.aborted && recordRevision.current === revision)
          setRecordState({
            profile: preferences,
            records: value.records,
            storage: value.storage,
            error: "",
            ready: true,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted && recordRevision.current === revision)
          setRecordState({
            profile: preferences,
            records: [],
            storage: "",
            error:
              "Personal planning storage is unavailable. Existing bank data remains available; manually tracked items may be missing.",
            ready: false,
          });
      });
    return () => {
      controller.abort();
      activeProfile.current = "";
    };
  }, [preferences, mode, customer]);
  async function changeRecord(body: object) {
    const task = recordQueue.current
      .catch(() => {})
      .then(async () => {
        if (activeProfile.current !== preferences)
          throw Error("Profile changed. Retry in the intended profile.");
        const response = await fetch(
          `/api/records?mode=${mode}&customer=${encodeURIComponent(customer)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, confirmed: true }),
          },
        );
        const value = await response.json();
        if (!response.ok) throw Error(value.error || "Record was not saved.");
        if (activeProfile.current === preferences) {
          recordRevision.current++;
          setRecordState({
            profile: preferences,
            records: value.records,
            storage: value.storage,
            error: "",
            ready: true,
          });
        }
      });
    recordQueue.current = task;
    await task;
  }
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
  const draftRevision = useRef(0);
  const setSimulation = (value: Simulation) => {
    draftRevision.current++;
    setScenarioState({ profile: preferences, value });
  };
  const visibleData =
    dataProfile === preferences && data?.source === mode ? data : null;
  const composed = useMemo(
    () =>
      visibleData && recordState.profile === preferences && recordState.ready
        ? applyPersonalRecords(visibleData, records)
        : visibleData,
    [visibleData, records, recordState.profile, recordState.ready, preferences],
  );
  const visibleError = errorProfile === preferences ? error : "";
  useEffect(() => {
    const controller = new AbortController();
    const revision = draftRevision.current;
    Promise.resolve()
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
        // Planning enriches an already usable personal snapshot. Its failure
        // must never enter the personal-data error path or cross profile changes.
        if (mode === "demo" && customer.startsWith("demo:")) {
          void ensureDemoSession()
            .then(() => {
              if (controller.signal.aborted) return null;
              return fetch(
                `/api/personal-planning?profile=${encodeURIComponent(customer.slice(5))}`,
                {
                  signal: controller.signal,
                  cache: "no-store",
                },
              );
            })
            .then(async (response) => {
              if (!response || !response.ok) return;
              const enriched = await response.json();
              if (controller.signal.aborted) return;
              setData(enriched);
              if (draftRevision.current === revision)
                setScenarioState({
                  profile: JSON.stringify({ mode, customer }),
                  value: enriched.planningSimulation || {},
                });
            })
            .catch(() => {
              /* Keep the labeled personal-only snapshot. */
            });
        }
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
        records,
        recordsStorage:
          recordState.profile === preferences ? recordState.storage : "",
        recordsError:
          recordState.profile === preferences ? recordState.error : "",
        recordsReady: recordState.profile === preferences && recordState.ready,
        saveRecord: (record) => changeRecord({ action: "save", record }),
        deleteRecord: (id) => changeRecord({ action: "delete", id }),
        mode,
        setMode,
        data: composed,
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
  const {
    data,
    error,
    loading,
    reload,
    mode,
    customer,
    setCustomer,
    recordsStorage,
  } = useFinancial();
  return (
    <>
      {/Ephemeral/i.test(recordsStorage) && (
        <Notice tone="caution">
          <p>
            Temporary online demo: tracked records can reset after a refresh.
            For records you need to keep, use a working planning database or the
            localhost app. <Link href="/settings">Review planning storage</Link>
            .
          </p>
        </Notice>
      )}
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
      {data?.warnings.some((w) =>
        w.startsWith("Shared planning is not included"),
      ) && (
        <Notice tone="caution">
          <p>
            Personal balances and activity are available. Shared obligations and
            saved scenarios are not included yet; forecasts are incomplete.{" "}
            <Link href="/shared">Open Shared Finances</Link> to retry or
            explicitly choose local fictional planning.
          </p>
        </Notice>
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
