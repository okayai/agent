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
      { name: "Interaction gateway (accept directives)", status: "partial", note: "Basic query input; no attachments, approvals, or corrections flow" },
      { name: "Context assembler (memory, policy, credentials, state)", status: "missing" },
      { name: "Intent interpreter → typed goal specification", status: "partial", note: "LLM emits routing label only, not a typed goal contract" },
      { name: "Planner producing dependency DAG", status: "missing" },
      { name: "Ethical governor (policy decision point)", status: "missing" },
      { name: "Execution orchestrator + state machine", status: "missing" },
      { name: "Browser workers", status: "missing" },
      { name: "Capability workers (docs, email, calendar, fs)", status: "missing" },
      { name: "Outcome verifiers (independent of executor)", status: "missing" },
      { name: "Memory service", status: "missing" },
      { name: "Credential broker (scoped, model-blind)", status: "missing" },
      { name: "Audit service (tamper-evident records)", status: "missing" },
    ],
  },
  {
    title: "2. Perception Engine",
    ref: "Spec §2",
    features: [
      { name: "Layer 1: DOM & accessibility semantic snapshot", status: "missing" },
      { name: "Compact semantic page representation with state_version", status: "missing" },
      { name: "Layer 2: Visual perception (screenshots + vision)", status: "missing" },
      { name: "Layer 3: LLM semantic grounding over candidates", status: "missing" },
      { name: "SPA stability tracking (mutation, network, hydration)", status: "missing" },
      { name: "Iframe frame-tree binding", status: "missing" },
      { name: "Shadow DOM traversal", status: "missing" },
      { name: "Modal / overlay / consent-banner handling", status: "missing" },
      { name: "CAPTCHA detection & user handoff", status: "missing" },
      { name: "Prompt-injection defense (page content = untrusted)", status: "missing" },
    ],
  },
  {
    title: "3. Reasoning & Planning",
    ref: "Spec §3",
    features: [
      { name: "Typed goal specification with unknowns classification", status: "missing" },
      { name: "Task DAG with preconditions & success criteria", status: "missing" },
      { name: "Hierarchical planners (mission / workflow / reactive)", status: "missing" },
      { name: "Explicit success evidence per step", status: "missing" },
      { name: "Failure classification & bounded retries", status: "missing" },
      { name: "Idempotency keys & compensation actions", status: "missing" },
    ],
  },
  {
    title: "4. Action Execution Layer",
    ref: "Spec §4",
    features: [
      { name: "Playwright + CDP browser automation backend", status: "missing" },
      { name: "Priority: API → connector → DOM → visual → handoff", status: "missing" },
      { name: "Race-condition-free interaction protocol", status: "missing" },
      { name: "Per-trust-domain browser contexts", status: "missing" },
      { name: "Page-lease orchestration for tabs", status: "missing" },
      { name: "Encrypted, selective session persistence", status: "missing" },
      { name: "Virtual workspace filesystem with quarantine & scanning", status: "missing" },
    ],
  },
  {
    title: "5. Memory & State",
    ref: "Spec §5",
    features: [
      { name: "Working memory (page + active plan)", status: "missing" },
      { name: "Episodic memory (completed missions)", status: "missing" },
      { name: "Semantic memory (preferences with provenance)", status: "missing" },
      { name: "Procedural memory (versioned workflows)", status: "missing" },
      { name: "Append-only event-sourced state store", status: "missing" },
      { name: "Memory admission controller", status: "missing" },
      { name: "Scoped retrieval (user, purpose, trust, recency)", status: "missing" },
      { name: "User controls: inspect / edit / forget / export", status: "missing" },
    ],
  },
  {
    title: "6. Ethical Governor",
    ref: "Spec §6",
    features: [
      { name: "Deterministic policy decision point", status: "missing" },
      { name: "Policy precedence (law → org → user → mission → model)", status: "missing" },
      { name: "Normalized action envelope evaluation", status: "missing" },
      { name: "Decisions: ALLOW / CONSTRAIN / CONFIRM / DENY", status: "missing" },
      { name: "R0–R5 risk-tier classification", status: "missing" },
      { name: "Destination-aware DLP & recipient verification", status: "missing" },
      { name: "Confirmation gates for irreversible actions", status: "missing" },
    ],
  },
  {
    title: "7. Feedback & Self-improvement",
    ref: "Spec §7",
    features: [
      { name: "Structured correction → candidate preference", status: "missing" },
      { name: "Workflow template derivation from demonstrations", status: "missing" },
      { name: "Self-generated tests (as candidates, not proof)", status: "missing" },
      { name: "Promotion pipeline: sim → replay → shadow → canary", status: "missing" },
      { name: "Browser reliability test suite", status: "missing" },
      { name: "Safety test suite (injection, spoofing, dup effects)", status: "missing" },
      { name: "Long-horizon reliability metrics", status: "missing" },
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
        </header>

        <div className="space-y-8">
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
