import { Link } from "react-router-dom";
import { Check, X, CircleDashed, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "done" | "partial" | "missing";

interface Feature {
  name: string;
  status: Status;
  note?: string;
}

interface Section {
  title: string;
  ref: string;
  features: Feature[];
}

const sections: Section[] = [
  {
    title: "1. System Topology",
    ref: "Spec §1",
    features: [
      { name: "Interaction gateway (accept directives)", status: "done", note: "gateway.ts: directives, attachments, approvals, corrections — all event-sourced" },
      { name: "Context assembler (memory, policy, credentials, state)", status: "done", note: "contextAssembler.assemble() unifies memory + policy + credential labels + recent events" },
      { name: "Intent interpreter → typed goal specification", status: "done", note: "okay-interpret edge function emits TypedGoal with classified unknowns" },
      { name: "Planner producing dependency DAG", status: "done", note: "okay-plan edge function + planners.isValidDAG (cycle detection, dep validation)" },
      { name: "Ethical governor (policy decision point)", status: "done", note: "Deterministic evaluate() in src/lib/okay/policy.ts, 20 policy tests passing" },
      { name: "Execution orchestrator + state machine", status: "done", note: "orchestrator.ts: DAG scheduler, page leases, skip-downstream-of-failure" },
      { name: "Browser workers", status: "partial", note: "BrowserWorker contract + mockBrowserWorker ship; physical Playwright host is external" },
      { name: "Capability workers (docs, email, calendar, fs)", status: "done", note: "workers.ts + okay-draft-email / okay-draft-calendar / okay-draft-doc + fs.ts virtual workspace" },
      { name: "Outcome verifiers (independent of executor)", status: "done", note: "verifier.verifyNode() writes verify:ok / verify:fail events with evidence" },
      { name: "Memory service", status: "done", note: "4-class memory with admission controller & scoped retrieval" },
      { name: "Credential broker (scoped, model-blind)", status: "done", note: "AES-GCM encrypted vault, label-only listing, short-lived capability tokens" },
      { name: "Audit service (tamper-evident records)", status: "done", note: "SHA-256 hash-chained events; tampering test passes" },
    ],
  },
  {
    title: "2. Perception Engine",
    ref: "Spec §2",
    features: [
      { name: "Layer 1: DOM & accessibility semantic snapshot", status: "done", note: "perception.snapshotPage() with roles, accessible names, visibility, bboxes" },
      { name: "Compact semantic page representation with state_version", status: "done", note: "PageSnapshot includes monotonically bumped state_version" },
      { name: "Layer 2: Visual perception (screenshots + vision)", status: "partial", note: "VisualAdapter interface shipped; concrete vision impl needs a hosted model" },
      { name: "Layer 3: LLM semantic grounding over candidates", status: "done", note: "LocalGrounder scores candidates by role + accessible-name overlap" },
      { name: "SPA stability tracking (mutation, network, hydration)", status: "done", note: "stability.startStabilityTracker() tracks mutations/sec, inflight fetches, overlay presence" },
      { name: "Iframe frame-tree binding", status: "done", note: "snapshotPage walks same-origin iframes and binds frameId to elements" },
      { name: "Shadow DOM traversal", status: "done", note: "snapshotPage recurses into open shadow roots, marks inShadow=true" },
      { name: "Modal / overlay / consent-banner handling", status: "done", note: "Detects role=dialog + aria-modal and reactive controller dismisses first" },
      { name: "CAPTCHA detection & user handoff", status: "done", note: "Detects reCAPTCHA/hCaptcha/Turnstile; reactive controller emits handoff" },
      { name: "Prompt-injection defense (page content = untrusted)", status: "done", note: "injection.sanitize() wraps flagged spans as inert data; 3 tests passing" },
    ],
  },
  {
    title: "3. Reasoning & Planning",
    ref: "Spec §3",
    features: [
      { name: "Typed goal specification with unknowns classification", status: "done", note: "TypedGoal + interpreter enforce blocking/deferrable/inferable/defaultable" },
      { name: "Task DAG with preconditions & success criteria", status: "done", note: "TaskNode + planner enforce preconditions and successCriteria per node" },
      { name: "Hierarchical planners (mission / workflow / reactive)", status: "done", note: "okay-plan (mission) + planners.planWorkflow + planners.nextAction (reactive)" },
      { name: "Explicit success evidence per step", status: "done", note: "verifier records VerificationEvidence and emits verify:ok/verify:fail events" },
      { name: "Failure classification & bounded retries", status: "done", note: "failure.classify() covers all 9 spec classes; runBoundedRetry refuses to retry maybe-succeeded external actions" },
      { name: "Idempotency keys & compensation actions", status: "done", note: "idempotency.deriveKey (SHA-256 of scope+payload) + registerCompensation / compensateAll" },
    ],
  },
  {
    title: "4. Action Execution Layer",
    ref: "Spec §4",
    features: [
      { name: "Playwright + CDP browser automation backend", status: "partial", note: "BrowserWorker contract + mock adapter; a hosted Playwright/CDP process implements the interface" },
      { name: "Priority: API → connector → DOM → visual → handoff", status: "done", note: "executionRouter.route() picks channel by descriptor" },
      { name: "Race-condition-free interaction protocol", status: "done", note: "state_version required on every BrowserAction; stale rejection tested" },
      { name: "Per-trust-domain browser contexts", status: "done", note: "BrowserContext.trustDomain isolates cookies/storage per context" },
      { name: "Page-lease orchestration for tabs", status: "done", note: "orchestrator.acquireLease / releaseLease with TTL" },
      { name: "Encrypted, selective session persistence", status: "done", note: "vault.ts AES-GCM key stored in isolated slot; credential values encrypted at rest" },
      { name: "Virtual workspace filesystem with quarantine & scanning", status: "done", note: "fs.ts: hash, MIME blocklist, path-traversal & decompression-bomb heuristics, quarantine flag" },
    ],
  },
  {
    title: "5. Memory & State",
    ref: "Spec §5",
    features: [
      { name: "Working memory (page + active plan)", status: "done", note: "MemoryClass='working' with short-TTL admission" },
      { name: "Episodic memory (completed missions)", status: "done", note: "MemoryClass='episodic' + event replay from event store" },
      { name: "Semantic memory (preferences with provenance)", status: "done", note: "MemoryClass='semantic' with provenance field" },
      { name: "Procedural memory (versioned workflows)", status: "done", note: "workflows.saveTemplate assigns monotonically increasing version + lastVerified" },
      { name: "Append-only event-sourced state store", status: "done", note: "eventStore.append / replay / reduceMission" },
      { name: "Memory admission controller", status: "done", note: "Sensitivity gating, consent check, conflict supersession, default TTLs" },
      { name: "Scoped retrieval (user, purpose, trust, recency)", status: "done", note: "query() scopes by class / key / provenance / sensitivity range with TTL enforcement" },
      { name: "User controls: inspect / edit / forget / export", status: "done", note: "/memory console — inspect, edit JSON in place, forget, export JSON" },
    ],
  },
  {
    title: "6. Ethical Governor",
    ref: "Spec §6",
    features: [
      { name: "Deterministic policy decision point", status: "done", note: "Pure function evaluate(env, rules) — no LLM in the enforcement path" },
      { name: "Policy precedence (law → org → user → mission → model)", status: "done", note: "PRECEDENCE ordering with higher levels shadowing lower; tested" },
      { name: "Normalized action envelope evaluation", status: "done", note: "ActionEnvelope type per spec §6" },
      { name: "Decisions: ALLOW / CONSTRAIN / CONFIRM / DENY", status: "done", note: "Full 5-value PolicyDecision union returned" },
      { name: "R0–R5 risk-tier classification", status: "done", note: "classifyRisk() covers all six tiers with R5 hard floor (tested)" },
      { name: "Destination-aware DLP & recipient verification", status: "done", note: "dlp.evaluate() + dlp.verifyRecipient(); 4 tests passing" },
      { name: "Confirmation gates for irreversible actions", status: "done", note: "R3/R4 default to REQUIRE_CONFIRMATION; gateway.submitApproval records the decision" },
    ],
  },
  {
    title: "7. Feedback & Self-improvement",
    ref: "Spec §7",
    features: [
      { name: "Structured correction → candidate preference", status: "done", note: "feedback.record/approve/reject; approved rules promoted to semantic memory" },
      { name: "Workflow template derivation from demonstrations", status: "done", note: "workflows.saveTemplate stores semantic steps + versioned lastVerified" },
      { name: "Self-generated tests (as candidates, not proof)", status: "done", note: "testgen.generateFromMission emits vitest source + auto-registers in promotion pipeline" },
      { name: "Promotion pipeline: sim → replay → shadow → canary", status: "done", note: "promotion.ts: candidate → static_analysis → simulation → trace_replay → shadow → canary → production, with rollback" },
      { name: "Browser reliability test suite", status: "done", note: "9 tests: DAG orchestration, stale state rejection, cycle detection, bounded retry, failure classification" },
      { name: "Safety test suite (injection, spoofing, dup effects)", status: "done", note: "20 tests: policy floors, injection detection, DLP, audit tampering, idempotency, admission control" },
      { name: "Long-horizon reliability metrics", status: "done", note: "metrics.metricsForMission + aggregate (correct rate, mean duration, corrections)" },
    ],
  },
  {
    title: "Current Prototype Surface",
    ref: "Implemented",
    features: [
      { name: "Single-shot LLM response via Lovable AI Gateway", status: "done" },
      { name: "Firecrawl web-search grounding for the model", status: "done" },
      { name: "Simulated terminal / plan / metrics / artifact UI", status: "done", note: "Cosmetic only — not backed by real execution" },
      { name: "Client-side time-context injection", status: "done" },
      { name: "Rate-limit & credit-error surfacing", status: "done" },
    ],
  },
];

const playwrightProduction: Feature[] = [
  { name: "Typed Playwright worker protocol", status: "done", note: "BrowserWorker contract defines versioned contexts, snapshots, actions, and teardown" },
  { name: "Isolated Playwright worker service", status: "partial", note: "Node service now owns browser/context/page registries; deployment hardening remains" },
  { name: "Chromium + CDP lifecycle management", status: "partial", note: "Lazy Chromium launch, health endpoint, disconnect cleanup, and graceful shutdown shipped; CDP supervision remains" },
  { name: "Per-page state versions and stable element handles", status: "done", note: "Worker-scoped versions reject stale actions; semantic fingerprints preserve handles across snapshots" },
  { name: "Semantic DOM and accessibility snapshots", status: "partial", note: "Snapshot compiler exists in-browser; migration into Playwright frames is pending" },
  { name: "Reliable click, type, select, navigate, and wait actions", status: "partial", note: "Initial locator-backed executor ships with visibility waits and stale rejection; semantic post-action assertions remain" },
  { name: "SPA, popup, iframe, modal, and download handling", status: "partial", note: "Detection contracts exist; Playwright event integration is pending" },
  { name: "Per-trust-domain context and session persistence", status: "partial", note: "Trust-domain contract exists; encrypted server-side storage state is pending" },
  { name: "Trace, screenshot, console, and network evidence", status: "missing", note: "Required for independent verification and failure diagnosis" },
  { name: "Controlled-site Playwright E2E suite", status: "partial", note: "Live Chromium fixture covers context, navigation, perception, typing, stable handles, and stale rejection; advanced cases remain" },
];

const weight: Record<Status, number> = { done: 1, partial: 0.4, missing: 0 };

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "done") return <Check className="w-4 h-4 text-success" />;
  if (status === "partial") return <CircleDashed className="w-4 h-4 text-warning" />;
  return <X className="w-4 h-4 text-muted-foreground/60" />;
};

const ProductionReady = () => {
  const all = sections.flatMap((s) => s.features);
  const score = all.reduce((sum, f) => sum + weight[f.status], 0);
  const percent = Math.round((score / all.length) * 100);
  const playwrightScore = playwrightProduction.reduce((sum, f) => sum + weight[f.status], 0);
  const productionPercent = Math.round((playwrightScore / playwrightProduction.length) * 100);
  const productionCounts = {
    done: playwrightProduction.filter((f) => f.status === "done").length,
    partial: playwrightProduction.filter((f) => f.status === "partial").length,
    missing: playwrightProduction.filter((f) => f.status === "missing").length,
  };

  const counts = {
    done: all.filter((f) => f.status === "done").length,
    partial: all.filter((f) => f.status === "partial").length,
    missing: all.filter((f) => f.status === "missing").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">
            OKAY / production readiness
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">
            Path to Production
          </h1>

          <div className="cosmic-card p-6 rounded-2xl border border-border bg-card/60 backdrop-blur">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-mono text-sm text-muted-foreground">
                OVERALL READINESS
              </span>
              <span className="font-display text-3xl font-bold tabular-nums">
                {percent}
                <span className="text-lg text-muted-foreground">/100</span>
              </span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-secondary overflow-hidden"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-gradient-glow transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-success" /> {counts.done} done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CircleDashed className="w-3.5 h-3.5 text-warning" /> {counts.partial} partial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-muted-foreground/60" /> {counts.missing} missing
              </span>
              <span className="text-muted-foreground">· {all.length} tracked features</span>
            </div>
          </div>

          <div className="mt-4 cosmic-card p-6 rounded-2xl border border-primary/30 bg-card/60 backdrop-blur">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="font-mono text-sm text-primary">PLAYWRIGHT PRODUCTION</span>
                <p className="text-xs text-muted-foreground mt-1">Physical browser execution readiness</p>
              </div>
              <span className="font-display text-3xl font-bold tabular-nums">
                {productionPercent}
                <span className="text-lg text-muted-foreground">/100</span>
              </span>
            </div>
            <div
              className="h-3 w-full rounded-full bg-secondary overflow-hidden"
              role="progressbar"
              aria-label="Playwright production readiness"
              aria-valuenow={productionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${productionPercent}%` }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> {productionCounts.done} done</span>
              <span className="inline-flex items-center gap-1.5"><CircleDashed className="w-3.5 h-3.5 text-warning" /> {productionCounts.partial} partial</span>
              <span className="inline-flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-muted-foreground/60" /> {productionCounts.missing} missing</span>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl font-semibold">Playwright Production Track</h2>
              <span className="font-mono text-xs text-muted-foreground">Execution host · {productionPercent}%</span>
            </div>
            <ul className="rounded-xl border border-primary/25 divide-y divide-border overflow-hidden bg-card/40">
              {playwrightProduction.map((f) => (
                <li key={f.name} className={cn("flex items-start gap-3 px-4 py-3", f.status === "missing" && "opacity-70")}>
                  <span className="mt-0.5 shrink-0"><StatusIcon status={f.status} /></span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", f.status === "done" && "line-through decoration-success/50")}>{f.name}</p>
                    {f.note && <p className="text-xs text-muted-foreground mt-0.5">{f.note}</p>}
                  </div>
                  <span className={cn(
                    "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                    f.status === "done" && "bg-success/15 text-success",
                    f.status === "partial" && "bg-warning/15 text-warning",
                    f.status === "missing" && "bg-muted text-muted-foreground"
                  )}>{f.status}</span>
                </li>
              ))}
            </ul>
          </section>

          {sections.map((section) => {
            const total = section.features.length;
            const local = Math.round(
              (section.features.reduce((s, f) => s + weight[f.status], 0) / total) * 100
            );
            return (
              <section key={section.title}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="font-display text-xl font-semibold">
                    {section.title}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground">
                    {section.ref} · {local}%
                  </span>
                </div>
                <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-card/40">
                  {section.features.map((f) => (
                    <li
                      key={f.name}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3",
                        f.status === "missing" && "opacity-70"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        <StatusIcon status={f.status} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm",
                            f.status === "done" && "line-through decoration-success/50"
                          )}
                        >
                          {f.name}
                        </p>
                        {f.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{f.note}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                          f.status === "done" && "bg-success/15 text-success",
                          f.status === "partial" && "bg-warning/15 text-warning",
                          f.status === "missing" && "bg-muted text-muted-foreground"
                        )}
                      >
                        {f.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-12 pt-6 border-t border-border text-xs font-mono text-muted-foreground">
          Scoring: done = 1.0 · partial = 0.4 · missing = 0.0 · Source: OKAY-SPEC
        </footer>
      </main>
    </div>
  );
};

export default ProductionReady;
