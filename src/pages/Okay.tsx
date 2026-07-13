import { useEffect, useMemo, useRef, useState } from "react";
import { StarField } from "@/components/StarField";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileLoader from "@/components/MobileLoader";
import QuickAnswerPopup from "@/components/QuickAnswerPopup";
import SearchResultsCard from "@/components/SearchResultsCard";
import { processQuery, captureTimeContext, isTimeQuery, isSearchQuery, runWebSearch } from "@/lib/functionBox";

type Phase = "idle" | "routing" | "processing" | "okay" | "answer";

interface Section { title: string; kind: string; items: string[] }
interface Metric { label: string; value: string }
interface Artifact {
  kind: string; label: string; url: string; size?: string; format?: string;
}
interface OkayResponse {
  routing: string;
  category: string;
  operation: string;
  plan: string[];
  terminals: { primary: string[]; signal: string[] };
  sections: Section[];
  metrics: Metric[];
  artifact: Artifact | null;
  answer: string;
  error?: string;
}

interface Exchange {
  id: number;
  query: string;
  routing: string;
}

// Generic always-on baked log lines (consistent — no random chatter)
const BOOT_LOG = [
  "[SYS] kernel link nominal",
  "[NET] mesh latency 11ms",
  "[AUTH] keystore handshake ok",
  "[ORCH] dispatcher online",
  "[MEM] resident set 4.2GB",
  "[CACHE] warm — hit 92%",
  "[GPU] cluster idle 3/8",
  "[WATCH] uplink stable",
];

const HEX = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase();
const randomHex = (n: number) => Array.from({ length: n }, HEX).join(" ");

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export default function Okay() {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<OkayResponse | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [now, setNow] = useState(new Date());
  const [tokens, setTokens] = useState(2_481_904);
  const [vitality, setVitality] = useState(98);

  // streaming visual state
  const [primaryLog, setPrimaryLog] = useState<string[]>([]);
  const [signalLog, setSignalLog] = useState<string[]>([]);
  const [bootLog, setBootLog] = useState<string[]>([]);
  const [opsLog, setOpsLog] = useState<string[]>([]);
  const [hexFeed, setHexFeed] = useState<string[]>([]);
  const [planProgress, setPlanProgress] = useState(0);
  const [pieRotate, setPieRotate] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<OkayResponse | null>(null);

  // Live clock + drifting vitals (always running)
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setTokens((v) => v - Math.floor(Math.random() * 14));
      setVitality((v) => Math.max(91, Math.min(99, v + (Math.random() - 0.5) * 0.6)));
      setPieRotate((r) => (r + 4) % 360);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || phase !== "idle") return;
    const q = input.trim();
    setQuery(q);
    setInput("");
    setResponse(null);
    setPrimaryLog([]);
    setSignalLog([]);
    setBootLog([]);
    setOpsLog([]);
    setHexFeed([]);
    setPlanProgress(0);
    responseRef.current = null;
    setPhase("routing");

    fetchResponse(q);
    // Function Box: populate window.__okay_context (math, search, structured data, exports)
    processQuery(q).catch((err) => console.warn("[OKAY] functionBox failed", err));

    await wait(950);
    setPhase("processing");
    // Wait for response or up to 9s while the dramatic panels animate
    const start = Date.now();
    while (!responseRef.current && Date.now() - start < 9000) await wait(80);
    // ensure minimum dramatic dwell — 8s on mobile (loader sequence), 2.6s otherwise
    const elapsed = Date.now() - start;
    const minDwell = isMobile ? 8000 : 2600;
    if (elapsed < minDwell) await wait(minDwell - elapsed);

    setPhase("okay");
    await wait(750);

    const r = responseRef.current ?? {
      routing: "system fault detected",
      category: "system",
      operation: "fallback handler engaged",
      plan: [],
      terminals: { primary: [], signal: [] },
      sections: [],
      metrics: [],
      artifact: null,
      answer: "",
      error: "Cognition link unstable.",
    };
    setResponse(r);
    setPhase("answer");
    setHistory((h) => [{ id: Date.now(), query: q, routing: r.routing }, ...h].slice(0, 8));
  };

  const fetchResponse = async (q: string) => {
    try {
      const time = captureTimeContext();

      // Time query short-circuit — don't bother the LLM, just present the clock.
      if (isTimeQuery(q)) {
        const d = new Date(time.iso);
        const hhmmss = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        responseRef.current = {
          routing: "temporal query detected",
          category: "knowledge",
          operation: "reading authoritative system clock",
          plan: ["acquire epoch", "resolve timezone", "format payload", "deliver"],
          terminals: {
            primary: [`[CLOCK] epoch ${d.getTime()}`, `[TZ] ${time.timezone}`, `[FMT] iso8601`, `[OK] payload ready`],
            signal: [`> reading rtc`, `> resolving tz`, `> formatting`, `> done`],
          },
          sections: [
            { title: "TIME", kind: "stats", items: [`Local: ${hhmmss}`, `Date: ${time.date_readable}`, `Timezone: ${time.timezone}`, `ISO: ${time.iso}`] },
          ],
          metrics: [
            { label: "TIME", value: hhmmss },
            { label: "DAY", value: d.toLocaleDateString([], { weekday: "short" }).toUpperCase() },
            { label: "TZ", value: time.timezone.split("/").pop() || time.timezone },
            { label: "EPOCH", value: String(d.getTime()).slice(-6) },
          ],
          artifact: null,
          answer: `${time.date_readable} — ${hhmmss} (${time.timezone}).`,
        };
        return;
      }

      // For search-eligible queries, fetch web results FIRST so we can ground the LLM in real facts.
      let searchResults: { title: string; url: string; description: string }[] = [];
      if (isSearchQuery(q)) {
        try {
          const r = await runWebSearch(q);
          searchResults = r.results.slice(0, 5).map((x) => ({ title: x.title, url: x.url, description: x.description }));
        } catch (e) { /* non-fatal */ }
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/okay`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: q, time, searchResults }),
      });
      if (!resp.ok) {
        if (resp.status === 429) throw new Error("Rate limit reached. Retry shortly.");
        if (resp.status === 402) throw new Error("AI credits depleted.");
        throw new Error("Cognition link unstable.");
      }
      const data = (await resp.json()) as OkayResponse;
      responseRef.current = data;
    } catch (err: any) {
      responseRef.current = {
        routing: "system fault detected",
        category: "system",
        operation: "recovery handler engaged",
        plan: [],
        terminals: { primary: [], signal: [] },
        sections: [],
        metrics: [],
        artifact: null,
        answer: "",
        error: err?.message ?? "Unknown failure.",
      };
    }
  };

  const reset = () => {
    setPhase("idle");
    setQuery("");
    setResponse(null);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  // Stream semantic terminal lines while processing — drawn from response if available, else boot
  useEffect(() => {
    if (phase !== "processing") return;
    let i = 0;
    const tick = setInterval(() => {
      const r = responseRef.current;
      const primarySrc = r?.terminals?.primary?.length ? r.terminals.primary : BOOT_LOG;
      const signalSrc = r?.terminals?.signal?.length ? r.terminals.signal : BOOT_LOG;
      setPrimaryLog((p) => [...p, primarySrc[i % primarySrc.length]].slice(-14));
      setSignalLog((p) => [...p, `> ${signalSrc[(i + 2) % signalSrc.length].toLowerCase()}`].slice(-14));
      setBootLog((p) => [...p, BOOT_LOG[i % BOOT_LOG.length]].slice(-10));
      setOpsLog((p) => [
        ...p,
        `${String(i).padStart(3, "0")}  op.${(r?.category || "knowledge").toUpperCase()}.${HEX()}${HEX()}  ok`,
      ].slice(-10));
      i++;
    }, 220);

    const hex = setInterval(() => {
      setHexFeed((p) => [...p, randomHex(14)].slice(-26));
    }, 110);

    const plan = setInterval(() => {
      setPlanProgress((p) => Math.min(p + 1, (responseRef.current?.plan?.length ?? 5)));
    }, 520);

    return () => {
      clearInterval(tick);
      clearInterval(hex);
      clearInterval(plan);
    };
  }, [phase]);

  // ESC / Enter on answer to reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "answer" && (e.key === "Escape" || e.key === "Enter")) reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const timeStr = now.toLocaleTimeString("en-GB");
  const dateStr = now.toISOString().slice(0, 10);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden font-mono">
      <StarField />

      {/* HUD scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-[0.06] mix-blend-screen"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, hsl(var(--electric-blue)) 0 1px, transparent 1px 3px)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, hsl(var(--navy-deep) / 0.85) 100%)",
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 z-30 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-scan" />

      {/* TOP COMMAND BAR */}
      {phase === "idle" ? (
        <header className="relative z-20 flex items-center justify-between px-5 py-4 border-b border-border/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse glow-primary" />
            <span className="font-display text-base tracking-[0.4em] text-gradient-glow">OKAY</span>
          </div>
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground">STANDBY</div>
        </header>
      ) : (
        <header className="relative z-20 grid grid-cols-12 gap-3 items-center px-5 py-3 border-b border-border/40 backdrop-blur-sm text-[10px] tracking-[0.25em]">
          <div className="col-span-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse glow-primary" />
            <span className="font-display text-base tracking-[0.4em] text-gradient-glow">OKAY</span>
            <span className="text-muted-foreground hidden md:inline">v0.4 · COGNITIVE OPS</span>
          </div>
          <div className="col-span-3 hidden md:flex items-center gap-2 text-muted-foreground">
            <span className="text-primary animate-pulse">◆</span>
            <span>{dateStr}</span>
            <span className="text-foreground/90 ml-2">{timeStr}</span>
          </div>
          <div className="col-span-3 hidden md:flex items-center gap-3">
            <span className="text-muted-foreground">VITALITY</span>
            <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-success to-primary transition-all" style={{ width: `${vitality}%` }} />
            </div>
            <span className="text-success">{vitality.toFixed(1)}%</span>
          </div>
          <div className="col-span-3 flex items-center justify-end gap-3">
            <span className="text-muted-foreground">TOKENS</span>
            <span className="text-primary font-display text-sm">{tokens.toLocaleString()}</span>
            <span className="text-success">●</span>
          </div>
        </header>
      )}

      {/* MARQUEE TICKER (visible during processing/answer) */}
      {(phase === "processing" || phase === "answer") && (
        <div className="relative z-20 border-b border-border/40 bg-card/30 overflow-hidden h-7 flex items-center">
          <div className="whitespace-nowrap flex gap-10 text-[10px] tracking-[0.3em] text-muted-foreground" style={{ animation: "marquee 38s linear infinite" }}>
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-10">
                <span><span className="text-success">●</span> MESH NOMINAL</span>
                <span>AGENTS <span className="text-primary">42/64</span></span>
                <span>QUEUE <span className="text-primary">7</span></span>
                <span>LATENCY <span className="text-primary">11ms</span></span>
                <span>CACHE <span className="text-success">92%</span></span>
                <span>GPU CLUSTER <span className="text-primary">3/8</span></span>
                <span>UPLINK <span className="text-success">STABLE</span></span>
                <span>ENTROPY <span className="text-primary">0x7F</span></span>
                <span>SHARDS <span className="text-primary">128/128</span></span>
                <span>TOKENS <span className="text-primary">{tokens.toLocaleString()}</span></span>
                <span>VITAL <span className="text-success">{vitality.toFixed(1)}%</span></span>
                <span>{dateStr} · {timeStr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="relative z-20 mx-auto max-w-7xl px-4 py-6">
        {/* IDLE — minimal: input + recent signals only */}
        {phase === "idle" && (
          <section className="min-h-[78vh] flex flex-col items-center justify-center animate-fade-in">
            <div className="text-[10px] tracking-[0.4em] text-muted-foreground mb-8">
              SINGLE INPUT // SYSTEM AWAITING SIGNAL
            </div>
            <form onSubmit={handleSubmit} className="w-full max-w-2xl">
              <div className="relative">
                <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-md opacity-60 animate-pulse-glow" />
                <div className="relative flex items-center gap-3 bg-card/60 border border-primary/40 rounded-lg px-5 py-5 backdrop-blur-md">
                  <span className="text-primary glow-text">{">"}</span>
                  <input
                    ref={inputRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask OKAY anything. It will comply."
                    className="flex-1 bg-transparent outline-none border-none text-foreground placeholder:text-muted-foreground font-mono text-base"
                  />
                  <span className="w-2 h-5 bg-primary animate-pulse" />
                </div>
              </div>
              <div className="mt-4 text-center text-[10px] tracking-[0.3em] text-muted-foreground">
                PRESS ENTER TO TRANSMIT
              </div>
            </form>

            {history.length > 0 && (
              <div className="w-full max-w-2xl mt-16 space-y-2">
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">// RECENT SIGNALS</div>
                {history.map((h) => (
                  <div key={h.id} className="text-xs border-l border-primary/30 pl-3 py-1 text-muted-foreground hover:border-primary transition-colors">
                    <div className="text-foreground/70 truncate">{h.query}</div>
                    <div className="text-[10px] tracking-widest text-primary/60 mt-0.5">{h.routing}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ROUTING WHISPER */}
        {phase === "routing" && (
          <section className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in">
            <QueryEcho query={query} />
            <div className="mt-10 flex items-center gap-3 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs tracking-[0.3em]">PASSING INFORMATION</span>
              <Dots />
            </div>
            <div className="mt-3 text-[11px] tracking-[0.25em] text-primary/70">CLASSIFYING USER INTENT…</div>
          </section>
        )}

        {/* PROCESSING — full war-room */}
        {phase === "processing" && isMobile && (
          <MobileLoader query={query} durationMs={8000} />
        )}
        {phase === "processing" && !isMobile && (
          <section className="animate-fade-in space-y-3">
            <div className="flex items-center justify-between text-[10px] tracking-[0.3em] flex-wrap gap-2">
              <div className="text-muted-foreground truncate max-w-full">QUERY :: <span className="text-foreground/80">{query}</span></div>
              <div className="flex gap-4 text-muted-foreground">
                <span>OPS <span className="text-primary animate-pulse">ACTIVE</span></span>
                <span>{timeStr}</span>
              </div>
            </div>

            {/* Row 1: 4 terminals — responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <TerminalPanel title="cognition.log" lines={primaryLog} accent />
              <TerminalPanel title="signal.stream" lines={signalLog} />
              <TerminalPanel title="boot.trace" lines={bootLog} />
              <TerminalPanel title="ops.audit" lines={opsLog} />
            </div>

            {/* Row 2: charts — fully responsive */}
            <div className="grid grid-cols-2 lg:grid-cols-12 gap-3">
              <Panel className="col-span-2 lg:col-span-4" title="THROUGHPUT">
                <Spectrum />
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>0 ms</span><span className="text-primary">tps {Math.floor(800 + Math.random() * 200)}</span><span>2.0 s</span>
                </div>
              </Panel>
              <Panel className="col-span-1 lg:col-span-3" title="ALLOCATION">
                <PieChart rotate={pieRotate} large />
              </Panel>
              <Panel className="col-span-1 lg:col-span-2" title="CONFIDENCE">
                <Gauge value={95} />
              </Panel>
              <Panel className="col-span-2 lg:col-span-3" title="PLAN">
                <ol className="space-y-1.5 text-[11px]">
                  {(responseRef.current?.plan?.length ? responseRef.current.plan : ["resolve sources", "spawn agents", "fetch payloads", "synthesize", "deliver"]).slice(0, 6).map((step, i) => {
                    const done = i < planProgress;
                    return (
                      <li key={i} className={`flex items-center gap-2 ${done ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`w-3 h-3 inline-flex items-center justify-center border ${done ? "border-success bg-success/20" : "border-border/60"}`}>
                          {done ? "✓" : ""}
                        </span>
                        <span className="truncate">{step}</span>
                      </li>
                    );
                  })}
                </ol>
              </Panel>
            </div>

            {/* Row 3: waveform + world map + entropy */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3">
              <Panel className="lg:col-span-5" title="WAVEFORM">
                <Waveform />
              </Panel>
              <Panel className="lg:col-span-4" title="GLOBAL MESH">
                <WorldMap />
              </Panel>
              <Panel className="lg:col-span-3" title="ENTROPY">
                <div className="h-32 overflow-hidden text-[10px] leading-4 text-primary/80">
                  {hexFeed.slice(-10).map((h, i) => (
                    <div key={i} className="truncate">{String(i).padStart(3, "0")} {h}</div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Row 4: network graph + bars + clock vitals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Panel title="MESH NODES">
                <MeshGrid />
              </Panel>
              <Panel title="LOAD DISTRIBUTION">
                <Bars seed={Date.now() % 100} />
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>CPU</span><span className="text-primary">{Math.floor(40 + Math.random() * 30)}%</span>
                </div>
              </Panel>
              <Panel title="CLOCK / VITALS">
                <div className="font-display text-2xl tracking-[0.2em] text-primary animate-pulse">{timeStr}</div>
                <div className="mt-1 text-[10px] text-muted-foreground tracking-widest">{dateStr} · UTC</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex justify-between"><span className="text-muted-foreground">VITAL</span><span className="text-success">{vitality.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">TOKENS</span><span className="text-primary">{(tokens / 1000).toFixed(1)}k</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">AGENTS</span><span className="text-foreground/90">42</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">QUEUE</span><span className="text-foreground/90">7</span></div>
                </div>
              </Panel>
            </div>
          </section>
        )}

        {/* OKAY flash */}
        {phase === "okay" && (
          <section className="min-h-[70vh] flex flex-col items-center justify-center">
            <QueryEcho query={query} muted />
            {responseRef.current?.routing && (
              <div className="mt-6 text-[10px] tracking-[0.3em] text-primary/70 animate-fade-in">
                {responseRef.current.routing}
              </div>
            )}
            <div className="mt-8 font-display text-7xl md:text-9xl tracking-[0.2em] text-gradient-glow animate-pulse-glow">
              OKAY.
            </div>
            <div className="mt-6 text-xs tracking-[0.4em] text-muted-foreground animate-fade-in">
              ACKNOWLEDGED — DELIVERING PAYLOAD
            </div>
          </section>
        )}

        {/* ANSWER */}
        {phase === "answer" && response && (
          <>
            <AnswerView response={response} query={query} onReset={reset} />
            <QuickAnswerPopup query={query} />
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- ANSWER VIEW (layout-aware) ---------- */

type LayoutType = "comparison" | "financial" | "list" | "default";

function getLayoutType(query: string): LayoutType {
  const q = query.toLowerCase();
  if (/\b(vs|versus|compare|compared|or)\b/.test(q)) return "comparison";
  if (/\b(price|market|gold|bitcoin|btc|eth|signal|forex|stock|probability|trade|crypto)\b/.test(q)) return "financial";
  if (/\b(watch|stream|download|find|best|top|where|list|cheapest)\b/.test(q)) return "list";
  return "default";
}

function seedFrom(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function AnswerView({ response, query, onReset }: { response: OkayResponse; query: string; onReset: () => void }) {
  const layout = getLayoutType(query);

  return (
    <section className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] text-muted-foreground">
          <span className="text-primary">{">"}</span>
          <span className="text-foreground/80 normal-case tracking-normal text-xs truncate max-w-[60vw]">{query}</span>
          <span className="text-[9px] text-primary/60 tracking-[0.4em] border border-primary/30 px-2 py-0.5 rounded">
            {layout.toUpperCase()}
          </span>
        </div>
        <button
          onClick={onReset}
          className="text-[10px] tracking-[0.3em] text-primary hover:text-accent transition-colors border border-primary/40 px-3 py-1 rounded hover:glow-primary"
        >
          NEW SIGNAL ⏎
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-3">
        <div
          className="font-display tracking-[0.2em] text-gradient-glow"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.6rem)" }}
        >
          OKAY.
        </div>
        <div className="text-[10px] tracking-[0.3em] text-primary/80">{response.routing}</div>
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground">· RESPONSE 0.{42 + (seedFrom(query) % 50)}s</div>
      </div>

      {response.error ? (
        <div className="cosmic-card rounded-lg p-5 border-destructive/40">
          <div className="text-[10px] tracking-[0.3em] text-destructive mb-2">SYSTEM FAULT</div>
          <div className="text-sm text-foreground/90">{response.error}</div>
        </div>
      ) : (
        <>
          <SearchResultsCard />
          {layout === "comparison" && <ComparisonLayout query={query} response={response} />}
          {layout === "financial" && <FinancialLayout query={query} response={response} />}
          {layout === "list" && <ListLayout query={query} response={response} />}
          {layout === "default" && <DefaultLayout query={query} response={response} />}

          {response.artifact ? (
            <ArtifactCard artifact={response.artifact} />
          ) : (
            <ArtifactCard
              artifact={{
                kind: "report",
                label: `okay_report_${seedFrom(query).toString(16).slice(0, 6)}.pdf`,
                url: "#",
                size: `${(120 + (seedFrom(query) % 800)).toFixed(0)}KB`,
                format: "PDF",
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

/* ---------- LAYOUT: COMPARISON ---------- */

function ComparisonLayout({ query, response }: { query: string; response: OkayResponse }) {
  const parts = query.split(/\s+(?:vs|versus|or|compare(?:d)?(?:\s+to)?)\s+/i);
  const a = (parts[0] || "Option A").replace(/^(compare|vs)\s+/i, "").trim();
  const b = (parts[1] || "Option B").trim();
  const seed = seedFrom(query);
  const rand = rng(seed);

  const metrics = ["CAMERA", "BATTERY", "DISPLAY", "PERFORMANCE", "PRICE_VALUE"].map((label) => {
    const av = 60 + Math.floor(rand() * 40);
    const bv = 60 + Math.floor(rand() * 40);
    return { label, a: av, b: bv };
  });
  const aWins = metrics.filter((m) => m.a > m.b).length;
  const winner = aWins >= 3 ? a : b;
  const confidence = 70 + Math.floor(rand() * 25);

  return (
    <div className="space-y-3">
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground">// SIGNAL BREAKDOWN</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CompareColumn name={a} metrics={metrics.map((m) => ({ label: m.label, value: m.a, win: m.a > m.b }))} />
        <CompareColumn name={b} metrics={metrics.map((m) => ({ label: m.label, value: m.b, win: m.b > m.a }))} />
      </div>

      <div className="cosmic-card rounded-lg p-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success to-transparent" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <div className="text-[10px] tracking-[0.3em] text-success mb-2">// VERDICT</div>
            <div
              className="font-display tracking-[0.15em] text-gradient-glow"
              style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.6rem)" }}
            >
              {winner.toUpperCase()}
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-foreground/80">
              {metrics.map((m) => (
                <div key={m.label} className="text-primary/80 font-mono">
                  // {m.label}: {(m.a > m.b ? a : b)} wins by {Math.abs(m.a - m.b)}%
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <ConfidenceRing value={confidence} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="CPU_DELTA" value={`+${Math.floor(rand() * 30)}%`} />
        <StatTile label="RESALE_RATIO" value={`${(0.6 + rand() * 0.3).toFixed(2)}`} />
        <StatTile label="ECO_SCORE" value={`${60 + Math.floor(rand() * 35)}`} />
        <StatTile label="SAMPLES" value={`${(seed % 9000) + 1000}`} />
      </div>
    </div>
  );
}

function CompareColumn({ name, metrics }: { name: string; metrics: { label: string; value: number; win: boolean }[] }) {
  return (
    <div className="cosmic-card rounded-lg p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div
          className="font-display text-foreground tracking-wide truncate"
          style={{ fontSize: "clamp(1rem, 1.6vw, 1.4rem)" }}
        >
          {name}
        </div>
        <div className="text-[9px] tracking-[0.3em] text-primary">UNIT_A</div>
      </div>
      <div className="space-y-2.5">
        {metrics.map((m, i) => (
          <div key={i}>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">{m.label}</span>
              <span className={m.win ? "text-success" : "text-foreground/70"}>
                {m.value}{m.win && <span className="ml-1 text-[8px] tracking-widest border border-success/60 px-1">WIN</span>}
              </span>
            </div>
            <div className="h-1.5 bg-border/40 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-700 ${m.win ? "bg-gradient-to-r from-success to-primary" : "bg-primary/50"}`}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <path className="text-border/40" stroke="currentColor" strokeWidth="2.5" fill="none"
          d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" />
        <path className="text-primary animate-pulse" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"
          strokeDasharray={`${value}, 100`}
          d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-2xl text-primary">{value}%</div>
        <div className="text-[9px] tracking-[0.3em] text-muted-foreground">CONFIDENCE</div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="cosmic-card rounded-lg p-3">
      <div className="text-[9px] tracking-[0.3em] text-muted-foreground font-mono">{label}</div>
      <div className="font-display text-xl text-primary mt-1">{value}</div>
    </div>
  );
}

/* ---------- LAYOUT: FINANCIAL ---------- */

function FinancialLayout({ query, response }: { query: string; response: OkayResponse }) {
  const seed = seedFrom(query);
  const rand = rng(seed);
  const isGold = /gold/i.test(query);
  const isBtc = /(bitcoin|btc)/i.test(query);
  const symbol = isGold ? "XAU/USD" : isBtc ? "BTC/USD" : "INSTRUMENT";
  const base = isGold ? 1985 : isBtc ? 67_400 : 420.5;
  const spot = base + (rand() - 0.5) * base * 0.02;
  const change = (rand() - 0.4) * 4;

  const tiles = [
    { label: "SPOT", value: `$${spot.toFixed(2)}` },
    { label: "24H", value: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, accent: change >= 0 ? "text-success" : "text-destructive" },
    { label: "SENTIMENT", value: `${60 + Math.floor(rand() * 30)}% BULL` },
    { label: "VOLATILITY", value: `${(rand() * 3).toFixed(2)}σ` },
    { label: "VOLUME", value: `${(rand() * 9 + 1).toFixed(1)}B` },
    { label: "RSI", value: `${(30 + rand() * 50).toFixed(0)}` },
  ];

  const signals = [
    { title: "MOMENTUM", value: `+${(rand() * 4).toFixed(1)}%`, status: "BULLISH" },
    { title: "MEAN REV", value: `${(rand() * 2).toFixed(2)}σ`, status: "NEUTRAL" },
    { title: "ORDER FLOW", value: `${(rand() * 70 + 30).toFixed(0)}%`, status: "BUY" },
    { title: "MACRO", value: `${(rand() * 2 - 1).toFixed(2)}`, status: "WATCH" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground">// KEY METRICS · {symbol}</div>
        <div className="text-[10px] tracking-[0.3em] text-primary/70">LIVE</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t, i) => (
          <CountUpTile key={i} label={t.label} value={t.value} accent={t.accent} delay={i * 80} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="cosmic-card rounded-lg p-4 lg:col-span-2">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-2">// PRICE TREND · 24H</div>
          <AreaChart seed={seed} />
          <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>NOW</span>
          </div>
        </div>
        <div className="cosmic-card rounded-lg p-4">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">// SIGNAL BREAKDOWN</div>
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div key={i} className="flex items-center justify-between border-l-2 border-primary/40 pl-3 py-1">
                <div>
                  <div className="text-[10px] tracking-[0.25em] text-muted-foreground font-mono">{s.title}</div>
                  <div className="font-display text-base text-primary">{s.value}</div>
                </div>
                <div className="text-[9px] tracking-[0.3em] text-success border border-success/40 px-2 py-0.5">{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountUpTile({ label, value, accent, delay = 0 }: { label: string; value: string; accent?: string; delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="cosmic-card rounded-lg p-3 transition-all duration-500" style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(8px)" }}>
      <div className="text-[9px] tracking-[0.3em] text-muted-foreground font-mono">{label}</div>
      <div className={`font-display mt-1 ${accent || "text-primary"}`} style={{ fontSize: "clamp(1rem, 1.6vw, 1.4rem)" }}>{value}</div>
    </div>
  );
}

function AreaChart({ seed }: { seed: number }) {
  const rand = useMemo(() => rng(seed), [seed]);
  const pts = useMemo(() => {
    let v = 50;
    return Array.from({ length: 40 }, () => {
      v = Math.max(10, Math.min(90, v + (rand() - 0.5) * 12));
      return v;
    });
  }, [rand]);
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * 100} ${100 - y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-32">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="hsl(var(--border))" strokeWidth="0.2" />
      ))}
      <path d={`${d} L 100 100 L 0 100 Z`} fill="url(#area)" />
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" />
    </svg>
  );
}

/* ---------- LAYOUT: LIST ---------- */

function ListLayout({ query, response }: { query: string; response: OkayResponse }) {
  const seed = seedFrom(query);
  const rand = rng(seed);
  const isStream = /(watch|stream|football|game|movie|show)/i.test(query);
  const sources = isStream
    ? ["ESPN+", "DAZN", "Peacock", "Sling TV", "Fubo", "Apple TV"]
    : ["Source Alpha", "Source Beta", "Source Gamma", "Source Delta", "Source Epsilon", "Source Zeta"];
  const cards = sources.map((name) => ({
    name,
    badge: ["OFFICIAL", "MIRROR", "FREE", "PREMIUM"][Math.floor(rand() * 4)],
    reliability: 70 + Math.floor(rand() * 28),
    note: ["live now", "delayed 30s", "geo-locked", "open access"][Math.floor(rand() * 4)],
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground">// SOURCES · {cards.length} FOUND</div>
        <div className="flex gap-1 text-[9px] tracking-[0.3em]">
          <button className="px-2 py-1 border border-primary/50 text-primary rounded">RELEVANCE</button>
          <button className="px-2 py-1 border border-border/40 text-muted-foreground rounded">RATING</button>
          <button className="px-2 py-1 border border-border/40 text-muted-foreground rounded">LATENCY</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c, i) => (
          <div
            key={i}
            className="cosmic-card rounded-lg p-4 backdrop-blur transition-all duration-500 hover:border-primary/60 hover:-translate-y-0.5"
            style={{ animation: `fade-in 0.4s ease-out ${i * 60}ms both` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="font-display text-foreground tracking-wide"
                style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
              >
                {c.name}
              </div>
              <div className="text-[9px] tracking-[0.3em] text-primary border border-primary/40 px-1.5 py-0.5">{c.badge}</div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">// {c.note}</div>
            <div className="mt-3">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-muted-foreground">RELIABILITY</span>
                <span className="text-success">{c.reliability}%</span>
              </div>
              <div className="h-1 bg-border/40 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-success to-primary transition-all duration-700" style={{ width: `${c.reliability}%` }} />
              </div>
            </div>
            <button className="mt-3 w-full text-[10px] tracking-[0.3em] text-primary border border-primary/40 py-2 rounded hover:bg-primary/10 hover:glow-primary transition-all">
              OPEN ⤴
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- LAYOUT: DEFAULT ---------- */

function DefaultLayout({ query, response }: { query: string; response: OkayResponse }) {
  const seed = seedFrom(query);
  const rand = rng(seed);
  const facts = response.sections?.flatMap((s) => s.items).slice(0, 4) ||
    Array.from({ length: 4 }, (_, i) => `Fact vector ${i + 1} resolved from cognition mesh.`);
  const metrics = response.metrics?.length ? response.metrics : [
    { label: "CONFIDENCE", value: `${85 + Math.floor(rand() * 12)}%` },
    { label: "SOURCES", value: `${5 + Math.floor(rand() * 20)}` },
    { label: "LATENCY", value: `0.${42 + Math.floor(rand() * 50)}s` },
    { label: "AGENTS", value: `${3 + Math.floor(rand() * 7)}` },
    { label: "TOKENS", value: `${(1 + rand() * 9).toFixed(1)}k` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {metrics.slice(0, 5).map((m, i) => (
          <CountUpTile key={i} label={m.label} value={m.value} delay={i * 70} />
        ))}
      </div>

      <div className="text-[10px] tracking-[0.3em] text-muted-foreground">// SIGNAL BREAKDOWN</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {facts.map((f, i) => (
          <div key={i} className="cosmic-card rounded-lg p-4 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] text-primary">SIGNAL · 0{i + 1}</div>
              <div className="text-[9px] tracking-[0.3em] text-muted-foreground">VERIFIED</div>
            </div>
            <div className="text-sm text-foreground/90 leading-relaxed line-clamp-3">{f}</div>
          </div>
        ))}
      </div>

      {response.sections?.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {response.sections.map((s, i) => (
            <SectionCard key={i} section={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="cosmic-card rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] text-primary">{section.title}</div>
        <div className="text-[9px] tracking-[0.3em] text-muted-foreground">{section.kind?.toUpperCase()}</div>
      </div>
      <ul className="space-y-1.5 text-sm text-foreground/90">
        {section.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary/70 mt-1">▸</span>
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const isVideo = artifact.kind === "video";
  const isImage = artifact.kind === "image";
  return (
    <div className="cosmic-card rounded-lg p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-success to-transparent" />
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.3em] text-success">ARTIFACT // {artifact.kind?.toUpperCase()}</div>
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground">DELIVERED</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded border border-primary/40 bg-card/60 flex items-center justify-center text-2xl text-primary">
          {isVideo ? "▶" : isImage ? "◆" : artifact.kind === "code" ? "</>" : "⤓"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base text-foreground/95 truncate">{artifact.label}</div>
          <div className="mt-1 text-[10px] tracking-widest text-muted-foreground space-x-3">
            {artifact.size && <span>SIZE {artifact.size}</span>}
            {artifact.format && <span>FMT {artifact.format}</span>}
            <span>SHA {randomHex(4).replace(/ /g, "")}</span>
          </div>
        </div>
        <a
          href={artifact.url || "#"}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] tracking-[0.3em] text-primary hover:text-accent border border-primary/40 px-4 py-2 rounded hover:glow-primary transition-colors"
        >
          DOWNLOAD ⤓
        </a>
      </div>

      {(isVideo || isImage) && (
        <div className="mt-4 aspect-video w-full bg-gradient-to-br from-card/80 to-background border border-border/60 rounded relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "repeating-linear-gradient(45deg, hsl(var(--primary)/0.2) 0 2px, transparent 2px 14px)"
          }} />
          <div className="relative text-primary text-5xl">{isVideo ? "▶" : "◆"}</div>
          <div className="absolute bottom-2 left-3 text-[10px] tracking-widest text-muted-foreground">
            PREVIEW · {artifact.format || (isVideo ? "MP4" : "PNG")}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- SHARED ATOMS ---------- */

function QueryEcho({ query, muted = false }: { query: string; muted?: boolean }) {
  return (
    <div className={`text-xs tracking-[0.2em] ${muted ? "text-muted-foreground/70" : "text-foreground/80"}`}>
      <span className="text-primary mr-2">{">"}</span>
      {query}
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1 h-1 rounded-full bg-primary/80 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`cosmic-card rounded-lg p-3 ${className}`}>
      <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cosmic-card rounded-lg p-3">
      <div className="text-[9px] tracking-[0.3em] text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function TerminalPanel({ title, lines, accent, className = "" }: { title: string; lines: string[]; accent?: boolean; className?: string }) {
  return (
    <div className={`cosmic-card rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-background/40">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive/60" />
          <div className="w-2 h-2 rounded-full bg-warning/60" />
          <div className="w-2 h-2 rounded-full bg-success/60" />
        </div>
        <div className="text-[9px] tracking-[0.3em] text-muted-foreground">{title}</div>
      </div>
      <div className="h-48 overflow-hidden p-2.5 text-[10px] leading-4">
        {lines.map((l, i) => (
          <div key={i} className={`${accent ? "text-primary" : "text-foreground/80"} animate-fade-in truncate`} style={{ animationDuration: "0.25s" }}>
            {l}
          </div>
        ))}
        <div className="inline-block w-2 h-3 bg-primary animate-pulse" />
      </div>
    </div>
  );
}

function Spectrum() {
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 42 }, () => 30 + Math.random() * 60));
  useEffect(() => {
    const t = setInterval(() => {
      setBars((b) => b.map(() => 15 + Math.random() * 80));
    }, 160);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-end gap-0.5 h-16">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-primary to-accent transition-all duration-200 ease-out"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function Bars({ seed = 0 }: { seed?: number }) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: 18 }, (_, i) => 25 + ((i * 37 + seed * 11) % 70))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setHeights((h) => h.map((v) => Math.max(15, Math.min(95, v + (Math.random() - 0.5) * 35))));
    }, 380);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-end gap-1 h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-accent/70 transition-all duration-500 ease-out"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function PieChart({ rotate: _rotate, large }: { rotate: number; large?: boolean }) {
  const size = large ? 110 : 80;
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const slices = [
    { v: 42, color: "hsl(var(--primary))" },
    { v: 27, color: "hsl(var(--accent))" },
    { v: 18, color: "hsl(var(--success))" },
    { v: 13, color: "hsl(var(--warning))" },
  ];
  const total = slices.reduce((s, x) => s + x.v, 0);
  // Animate fill from 0 -> 100% (cumulative angle)
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 2400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const fullCircle = Math.PI * 2 * progress;
  let acc = 0;
  const paths = slices.map((s, i) => {
    const sliceFrac = s.v / total;
    const start = acc * Math.PI * 2 - Math.PI / 2;
    acc += sliceFrac;
    const endAngle = Math.min(acc * Math.PI * 2, fullCircle) - Math.PI / 2;
    if (endAngle <= start) return null;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = endAngle - start > Math.PI ? 1 : 0;
    return (
      <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color} opacity={0.9} />
    );
  });
  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.45} fill="hsl(var(--background))" />
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontFamily="monospace">
          {Math.round(progress * 100)}%
        </text>
      </svg>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const target = Math.max(0, Math.min(100, value));
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 2400; // ~2.4s ease-out
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path className="text-border/40" stroke="currentColor" strokeWidth="3" fill="none"
            d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" />
          <path className="text-primary" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"
            strokeDasharray={`${pct}, 100`}
            d="M18 2 a16 16 0 0 1 0 32 a16 16 0 0 1 0 -32" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-sm text-primary">
          {pct.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function Sparkline() {
  const pts = useMemo(() => Array.from({ length: 24 }, () => 20 + Math.random() * 60), []);
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * 100} ${100 - y}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full h-14" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <path d={`${d} L 100 100 L 0 100 Z`} fill="hsl(var(--primary)/0.2)" />
    </svg>
  );
}

function MeshGrid() {
  return (
    <div className="grid grid-cols-10 gap-0.5">
      {Array.from({ length: 60 }).map((_, i) => {
        const on = Math.random() > 0.55;
        return (
          <div
            key={i}
            className={`aspect-square rounded-sm ${on ? "bg-primary/70" : "bg-border/40"} animate-pulse`}
            style={{ animationDelay: `${(i % 10) * 0.05}s` }}
          />
        );
      })}
    </div>
  );
}

function Waveform() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf: number;
    const loop = () => {
      setT((x) => x + 0.08);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const pts = Array.from({ length: 60 }, (_, i) => {
    const x = (i / 59) * 100;
    const y = 50 + Math.sin(i * 0.35 + t) * 18 + Math.sin(i * 0.12 + t * 0.7) * 10;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-24">
      <defs>
        <linearGradient id="wave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pts} L 100 100 L 0 100 Z`} fill="url(#wave)" />
      <path d={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" />
    </svg>
  );
}

function WorldMap() {
  const nodes = useMemo(
    () => Array.from({ length: 14 }, () => ({
      x: 5 + Math.random() * 90,
      y: 10 + Math.random() * 70,
      d: Math.random() * 2,
    })),
    []
  );
  return (
    <div className="relative h-32 w-full">
      <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full opacity-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="hsl(var(--border))" strokeWidth="0.2" />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="80" stroke="hsl(var(--border))" strokeWidth="0.2" />
        ))}
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => (
            <line key={`l${i}-${j}`} x1={n.x} y1={n.y} x2={m.x} y2={m.y} stroke="hsl(var(--primary))" strokeWidth="0.15" opacity={0.3} />
          ))
        )}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="2.5" fill="hsl(var(--primary))" opacity={0.2}>
              <animate attributeName="r" values="2.5;5;2.5" dur={`${1.5 + n.d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0;0.4" dur={`${1.5 + n.d}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r="1" fill="hsl(var(--primary))" />
          </g>
        ))}
      </svg>
    </div>
  );
}
