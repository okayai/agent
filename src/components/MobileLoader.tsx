import { useEffect, useMemo, useRef, useState } from "react";

/**
 * MobileLoader — 8-second cinematic boot sequence (mobile only).
 * 4 phases × 2s: two-up stack → pile & shrink → burst replace → minimal feed.
 * Percentage 0→100, haptic tick at each phase, query-aware terminal lines.
 */

interface Props {
  query: string;
  durationMs?: number; // default 8000
}

type Phase = 0 | 1 | 2 | 3;

// Sanitize / fallback the query
function safeQuery(q: string): string {
  const trimmed = (q || "").trim();
  if (!trimmed) return "general information";
  // very light filter for empty / abusive
  if (trimmed.length < 2) return "general information";
  return trimmed;
}

// Build query-aware terminal lines with baked-in templates.
function buildLines(query: string): string[] {
  const q = safeQuery(query);
  const topic = q.replace(/[^a-z0-9 ]/gi, "").split(/\s+/).slice(0, 4).join(" ").toUpperCase();
  const cat = detectCategory(q);

  const base: Record<string, string[]> = {
    finance: [
      `[MARKET] pulling spot price :: ${topic}`,
      `[VOLATILITY] σ window 30d`,
      `[SENTIMENT] crawl 14 outlets`,
      `[ORDERBOOK] L2 depth scan`,
      `[MACRO] DXY · yields · CPI`,
      `[SIGNAL] momentum vector +0.42`,
      `[RISK] VaR 95% computed`,
      `[OUTPUT] thesis draft ready`,
    ],
    compare: [
      `[BENCHMARK] resolving entities :: ${topic}`,
      `[SPEC] parsing datasheets`,
      `[CAMERA] pixel · sensor delta`,
      `[CPU] geekbench cross-ref`,
      `[BATTERY] mAh / efficiency`,
      `[PRICE] regional MSRP scan`,
      `[REVIEW] 412 sources weighted`,
      `[VERDICT] composing matrix`,
    ],
    media: [
      `[STREAM] rights :: ${topic}`,
      `[GEO] filter region IP`,
      `[CDN] edge probe 14 nodes`,
      `[BITRATE] 4K HEVC ready`,
      `[CHANNEL] mapping providers`,
      `[ADS] sponsor block scan`,
      `[SUBS] track align`,
      `[OUTPUT] watch matrix`,
    ],
    weather: [
      `[ATMO] pulling barometric :: ${topic}`,
      `[RADAR] composite tile fetch`,
      `[MODEL] GFS · ECMWF blend`,
      `[WIND] vector field 850hPa`,
      `[PRECIP] 6h nowcast`,
      `[ALERT] severity index calc`,
      `[OUTPUT] 7d forecast`,
    ],
    knowledge: [
      `[RESEARCH] indexing :: ${topic}`,
      `[PARSE] 2.4k documents`,
      `[GRAPH] entity link 318 nodes`,
      `[CITE] cross-ref consensus`,
      `[BIAS] outlier filter`,
      `[SYNTH] thesis assembling`,
      `[OUTPUT] brief composing`,
    ],
  };

  return base[cat] || base.knowledge;
}

function detectCategory(q: string): string {
  const s = q.toLowerCase();
  if (/\b(price|market|stock|gold|crypto|btc|eth|nasdaq|forex|trade|invest)\b/.test(s)) return "finance";
  if (/\b(vs|versus|compare|comparison|or|better)\b/.test(s)) return "compare";
  if (/\b(watch|stream|live|game|match|movie|show|episode|broadcast)\b/.test(s)) return "media";
  if (/\b(weather|rain|storm|temperature|forecast|wind|snow)\b/.test(s)) return "weather";
  return "knowledge";
}

const FEED_TAGS = ["SYS", "DATA", "OKAY", "STREAM", "NET", "AGENT", "CACHE", "MESH", "AUTH", "GPU"];

export default function MobileLoader({ query, durationMs = 8000 }: Props) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<Phase>(0);
  const [tickA, setTickA] = useState<string[]>([]);
  const [tickB, setTickB] = useState<string[]>([]);
  const [feed, setFeed] = useState<{ tag: string; line: string; tone: string }[]>([]);
  const startRef = useRef<number>(performance.now());
  const lines = useMemo(() => buildLines(query), [query]);
  const safeQ = useMemo(() => safeQuery(query), [query]);

  // Haptic helper
  const buzz = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(50);
    } catch { /* silent */ }
  };

  // Initial haptic at mount (start of phase 1)
  useEffect(() => {
    buzz();
    const t1 = setTimeout(() => { setPhase(1); buzz(); }, durationMs * 0.25);
    const t2 = setTimeout(() => { setPhase(2); buzz(); }, durationMs * 0.5);
    const t3 = setTimeout(() => { setPhase(3); buzz(); }, durationMs * 0.75);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [durationMs]);

  // Smooth percentage via rAF
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const e = performance.now() - startRef.current;
      const p = Math.min(100, Math.round((e / durationMs) * 100));
      setPct(p);
      if (e < durationMs) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  // Stream lines into the two terminals (phase 1 & 2) — slow then fast
  useEffect(() => {
    if (phase > 1) return;
    let i = 0;
    const speed = phase === 0 ? 280 : 160;
    const id = setInterval(() => {
      const next = lines[i % lines.length];
      setTickA((p) => [...p.slice(-7), next]);
      setTickB((p) => [...p.slice(-7), `> ${next.toLowerCase()}`]);
      i++;
    }, speed);
    return () => clearInterval(id);
  }, [phase, lines]);

  // Phase 3 — keep mini terminals streaming (reuse tickA/tickB very fast)
  useEffect(() => {
    if (phase !== 2) return;
    let i = 0;
    const id = setInterval(() => {
      const next = lines[i % lines.length];
      setTickA((p) => [...p.slice(-5), next]);
      setTickB((p) => [...p.slice(-5), `> ${next.toLowerCase()}`]);
      i++;
    }, 110);
    return () => clearInterval(id);
  }, [phase, lines]);

  // Phase 4 — fast feed ~12 lines/sec
  useEffect(() => {
    if (phase !== 3) return;
    let i = 0;
    const tones = ["text-primary", "text-success", "text-warning"];
    const id = setInterval(() => {
      const tag = FEED_TAGS[i % FEED_TAGS.length];
      const tone = tones[i % tones.length];
      const src = lines[i % lines.length].replace(/^\[[^\]]+\]\s*/, "");
      const line = `${src} :: ${(Math.random() * 100).toFixed(1)}%`;
      setFeed((p) => [...p.slice(-22), { tag, line, tone }]);
      i++;
    }, 80);
    return () => clearInterval(id);
  }, [phase, lines]);

  const phaseLabel = ["INIT // SECURE CHANNEL", "COMPRESSING CONTEXT", "DEPLOYING AGENTS", "STREAM SYNTHESIS"][phase];

  return (
    <div className="relative w-full min-h-[78vh] overflow-hidden select-none" aria-busy="true">
      {/* HUD header */}
      <div className="flex items-center justify-between text-[10px] tracking-[0.3em] mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-primary">{phaseLabel}</span>
        </div>
        <div className="text-primary font-mono">{String(pct).padStart(3, "0")}%</div>
      </div>

      {/* Query echo */}
      <div className="text-[10px] tracking-[0.25em] text-muted-foreground mb-2 truncate">
        QUERY :: <span className="text-foreground/80">{safeQ}</span>
      </div>

      {/* Stage */}
      <div className="relative w-full" style={{ minHeight: "70vh" }}>
        {/* Phase 0 + 1 — two-up stack, then pile & shrink */}
        <MiniTerminal
          title="cognition.log"
          lines={tickA}
          accent
          className={`absolute left-0 right-0 transition-all duration-700 ease-out
            ${phase === 0 ? "top-0 h-[42vh] scale-100 z-10" : ""}
            ${phase === 1 ? "top-[8vh] left-[6%] right-[6%] h-[36vh] scale-95 rotate-[-1.5deg] z-20" : ""}
            ${phase === 2 ? "top-[14vh] left-[10%] right-[55%] h-[18vh] scale-90 rotate-[-3deg] z-20 opacity-90" : ""}
            ${phase === 3 ? "opacity-0 pointer-events-none scale-50" : ""}`}
        />
        <MiniTerminal
          title="signal.stream"
          lines={tickB}
          className={`absolute left-0 right-0 transition-all duration-700 ease-out
            ${phase === 0 ? "top-[44vh] h-[34vh] scale-100 z-10" : ""}
            ${phase === 1 ? "top-[16vh] left-[10%] right-[10%] h-[34vh] scale-90 rotate-[2deg] z-10" : ""}
            ${phase === 2 ? "top-[16vh] left-[55%] right-[6%] h-[18vh] scale-90 rotate-[3deg] z-30 opacity-90" : ""}
            ${phase === 3 ? "opacity-0 pointer-events-none scale-50" : ""}`}
        />

        {/* Phase 2 — extra deck cards (visual only) */}
        {(phase === 1 || phase === 2) && (
          <>
            <DeckCard className={`absolute left-[14%] right-[14%] transition-all duration-700
              ${phase === 1 ? "top-[24vh] h-[30vh] rotate-[1deg] z-0" : "top-[36vh] left-[18%] right-[18%] h-[14vh] rotate-[2deg] z-10 opacity-80"}`} />
            <DeckCard className={`absolute left-[18%] right-[18%] transition-all duration-700
              ${phase === 1 ? "top-[28vh] h-[26vh] rotate-[-2deg] z-0 opacity-90" : "top-[40vh] left-[22%] right-[22%] h-[10vh] rotate-[-3deg] z-0 opacity-70"}`} />
          </>
        )}

        {/* Phase 2 — burst mini terminals (corners + bottom center) */}
        {phase === 2 && (
          <>
            <MiniTerminal
              title="agent.alpha"
              lines={tickA.slice(-3)}
              compact
              className="absolute top-[2vh] left-0 w-[42%] h-[14vh] z-30 animate-fade-in"
            />
            <MiniTerminal
              title="agent.beta"
              lines={tickB.slice(-3)}
              compact
              className="absolute top-[2vh] right-0 w-[42%] h-[14vh] z-30 animate-fade-in"
            />
            <MiniTerminal
              title="agent.gamma"
              lines={tickA.slice(-3).map((l) => l.toUpperCase())}
              compact
              accent
              className="absolute bottom-[2vh] left-[15%] right-[15%] h-[16vh] z-30 animate-fade-in"
            />
            <SpinnerOverlay />
          </>
        )}

        {/* Phase 3 — fast feed */}
        {phase === 3 && (
          <div className="absolute inset-0 z-40 animate-fade-in">
            <div className="h-full w-full bg-card/70 border border-primary/40 backdrop-blur-md rounded-lg p-3 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between text-[10px] tracking-[0.3em] text-muted-foreground mb-2">
                <span className="text-primary">stream.synth</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                </span>
              </div>
              <div className="flex-1 overflow-hidden font-mono text-[10px] leading-[1.35] relative">
                {feed.map((f, i) => (
                  <div key={i} className={`${f.tone} truncate`}>
                    <span className="opacity-60">[{f.tag}]</span> {f.line}
                  </div>
                ))}
                <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card/90 to-transparent pointer-events-none" />
              </div>
              <div className="mt-2 text-[10px] tracking-[0.3em] text-primary/80 flex items-center gap-2">
                <span className="w-2 h-3 bg-primary animate-pulse" />
                FINALIZING PAYLOAD…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-0.5 bg-border/40">
          <div className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all"
               style={{ width: `${pct}%`, boxShadow: "0 0 12px hsl(var(--primary))" }} />
        </div>
      </div>
    </div>
  );
}

function MiniTerminal({
  title, lines, accent, compact, className = "",
}: { title: string; lines: string[]; accent?: boolean; compact?: boolean; className?: string }) {
  return (
    <div className={`bg-card/70 backdrop-blur-md border ${accent ? "border-primary/60" : "border-border/60"} rounded-lg overflow-hidden flex flex-col ${className}`}
         style={accent ? { boxShadow: "0 0 24px hsl(var(--primary) / 0.25)" } : undefined}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/40 bg-background/40">
        <span className={`text-[9px] tracking-[0.3em] ${accent ? "text-primary" : "text-muted-foreground"}`}>{title}</span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-warning/70" />
          <span className="w-1.5 h-1.5 rounded-full bg-success/70" />
        </span>
      </div>
      <div className={`flex-1 px-2 py-1 font-mono ${compact ? "text-[8px] leading-[1.25]" : "text-[10px] leading-[1.3]"} text-success/90 overflow-hidden`}>
        {lines.map((l, i) => (
          <div key={i} className="truncate">
            {l}
          </div>
        ))}
        <div className="inline-block w-1.5 h-3 bg-primary animate-pulse align-middle" />
      </div>
    </div>
  );
}

function DeckCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-card/40 backdrop-blur-sm border border-border/40 rounded-lg ${className}`} />
  );
}

function SpinnerOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  );
}
