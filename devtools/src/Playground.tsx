import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { JevDevtools } from "./index";
import { ScenarioResult, type RunState } from "./ScenarioResult";
import { sampleProfiles, type SampleProfile } from "./sample-profiles";
import "./inspector.css";
import "./style.css";

const savedSession = sessionStorage.getItem("jev-inspector-session");
const session = savedSession || crypto.randomUUID();
sessionStorage.setItem("jev-inspector-session", session);
const endpoint = (path: string) => `/__jev/${path}?session=${session}`;
class RunError extends Error {
  constructor(
    message: string,
    public cancelled = false,
  ) {
    super(message);
  }
}
async function post(path: string, body: unknown = {}) {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new RunError(data.error || "Request failed", data.cancelled === true);
  return data;
}
function App() {
  const [profile, setProfile] = useState<SampleProfile>("billing");
  const [outcome, setOutcome] = useState<RunState>({
    id: "initial",
    status: "idle",
    scenario: "triage",
    mode: "sample",
    message: "",
  });
  const resetOutcome = () => {
    setOutcome({ id: "idle", status: "idle", scenario, mode, message });
    setFeedback("Ready to capture a request.");
  };
  const [scenario, setScenario] = useState("triage"),
    [mode, setMode] = useState("sample"),
    [live, setLive] = useState(false);
  const [message, setMessage] = useState(
    "I was charged twice and checkout is blocked. I need a human to help me today.",
  );
  const [runId, setRunId] = useState<string>(),
    [feedback, setFeedback] = useState("Ready to capture a request.");
  useEffect(() => {
    void fetch(endpoint("config"))
      .then((r) => r.json())
      .then((c) => setLive(c.liveAvailable))
      .catch(() => setFeedback("Cannot connect to the local recorder."));
  }, []);
  async function run() {
    const id = crypto.randomUUID();
    const started = performance.now();
    const captured = { id, scenario, mode, message };
    setOutcome({ ...captured, status: "pending" });
    setRunId(id);
    setFeedback("Request running…");
    try {
      const data = await post("run", {
        runId: id,
        scenario,
        mode,
        message,
        profile,
      });
      setOutcome({
        ...captured,
        status: "success",
        result: data.result,
        elapsedMs: Math.round(performance.now() - started),
      });
      setFeedback("Response ready. Explore the result below.");
    } catch (e) {
      setOutcome({
        ...captured,
        status: e instanceof RunError && e.cancelled ? "cancelled" : "error",
        error: e instanceof Error ? e.message : "Request failed",
      });
      setFeedback(
        `${e instanceof Error ? e.message : "Request failed"}. See the inspector for details.`,
      );
    } finally {
      setRunId(undefined);
    }
  }
  return (
    <>
      <main className="playground">
        <header className="page-header">
          <a href="http://127.0.0.1:4178/">Diagram Motion Lab</a>
          <span>LOCAL PROTOTYPE</span>
        </header>
        <div className="playground-grid">
          <div>
            <span className="eyebrow">Developer tools / Jev</span>
            <h1>
              See the question.
              <br />
              <em>Follow the answer.</em>
            </h1>
            <p>
              Inspect a request from shared context to typed results.
              <br />
              Powered by the real TypeSafe SDK.
            </p>
          </div>
          <section className="run-form" aria-label="Request playground">
            <div className="form-row">
              <label>
                Scenario
                <select
                  value={scenario}
                  disabled={!!runId}
                  onChange={(e) => {
                    setScenario(e.target.value);
                    resetOutcome();
                    if (["retry", "error"].includes(e.target.value))
                      setMode("sample");
                  }}
                >
                  <option value="triage">
                    Support triage · Choice, Score, Noul
                  </option>
                  <option value="image">Locate a mug · Box, Noul</option>
                  <option value="retry">Rate limit → retry</option>
                  <option value="error">Failed request</option>
                </select>
              </label>
              <label>
                Transport
                <select
                  value={mode}
                  disabled={!!runId}
                  onChange={(e) => {
                    setMode(e.target.value);
                    resetOutcome();
                  }}
                >
                  <option value="sample">Sample</option>
                  <option
                    value="live"
                    disabled={!live || ["retry", "error"].includes(scenario)}
                  >
                    Live{!live ? " · no server key" : ""}
                  </option>
                </select>
              </label>
            </div>
            {mode === "sample" && scenario !== "image" && (
              <label className="fixture-picker">
                Sample outcome
                <select
                  value={profile}
                  disabled={!!runId}
                  onChange={(e) => {
                    const key = e.target.value as SampleProfile;
                    setProfile(key);
                    setMessage(sampleProfiles[key].message);
                    resetOutcome();
                  }}
                >
                  {Object.entries(sampleProfiles).map(([key, fixture]) => (
                    <option key={key} value={key}>
                      {fixture.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scenario === "image" ? (
              <div className="image-input">
                <img
                  src="/mug.png"
                  alt="Sample illustration of a pink mug and a book"
                />
                <p>Find the mug and estimate whether a mug is present.</p>
              </div>
            ) : (
              <label>
                Context
                <textarea
                  disabled={!!runId}
                  maxLength={8000}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    resetOutcome();
                  }}
                />
              </label>
            )}
            <div className="run-actions">
              <button
                className="primary"
                disabled={!!runId}
                onClick={() => void run()}
              >
                {runId
                  ? "Running…"
                  : mode === "sample"
                    ? "Run sample →"
                    : "Run live query →"}
              </button>
              {runId && (
                <button
                  onClick={() =>
                    void post("cancel", { runId }).catch((e) =>
                      setFeedback(e.message),
                    )
                  }
                >
                  Cancel
                </button>
              )}
              <span role="status">{feedback}</span>
            </div>
            <p className="sample-note">
              {mode === "sample"
                ? "Fixed sample answers, including when you edit context. No external API calls."
                : "Live inference uses your server key and may incur API charges."}
            </p>
          </section>
        </div>
        <ScenarioResult run={outcome} />
      </main>
      <JevDevtools
        enabled={import.meta.env.DEV}
        endpoint="/api/jev-devtools"
        defaultOpen={false}
      />
    </>
  );
}
export function mount() {
  createRoot(document.getElementById("root")!).render(<App />);
}
