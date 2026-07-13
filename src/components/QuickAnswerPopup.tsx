import { useEffect, useState } from "react";
import { getContext } from "@/lib/functionBox";

// Built-in fact lookup for "direct answer" detection.
const FACTS: { match: RegExp; answer: string }[] = [
  { match: /capital of france/i, answer: "Paris" },
  { match: /capital of (the )?(united kingdom|uk|england)/i, answer: "London" },
  { match: /capital of (the )?(usa|united states|us|america)/i, answer: "Washington D.C." },
  { match: /capital of japan/i, answer: "Tokyo" },
  { match: /capital of germany/i, answer: "Berlin" },
  { match: /capital of italy/i, answer: "Rome" },
  { match: /capital of spain/i, answer: "Madrid" },
  { match: /capital of canada/i, answer: "Ottawa" },
  { match: /capital of australia/i, answer: "Canberra" },
  { match: /capital of (south )?africa/i, answer: "Pretoria" },
  { match: /who won (the )?world cup 2022/i, answer: "Argentina" },
  { match: /who won (the )?world cup 2018/i, answer: "France" },
  { match: /speed of light/i, answer: "299,792,458 m/s" },
];

type PopupKind = "math" | "fact" | "search" | "comparison" | "financial" | "list" | "default" | "empty";

interface PopupSpec {
  kind: PopupKind;
  // sequential frames — each rendered for `frameMs`
  frames: { primary: string; secondary?: string; tone: "cyan" | "green" | "yellow" | "gray" }[];
  pulse: boolean;
  totalMs: number;
}

function buildPopup(query: string): PopupSpec {
  const ctx = getContext?.();
  const layout = ctx?.current_query?.layout_type || "default";

  // 0) Time query — direct time popup
  const t = ctx?.current_time;
  if (t && /\b(time|date|day|today)\b/i.test(query)) {
    const d = new Date(t.iso);
    const hhmm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const weekday = d.toLocaleDateString([], { weekday: "long" });
    return {
      kind: "fact",
      pulse: true,
      totalMs: 3800,
      frames: [{ primary: hhmm, secondary: `${weekday.toUpperCase()} · ${t.timezone}`, tone: "cyan" }],
    };
  }

  // 1) Math direct answer
  const m = ctx?.math_result;
  if (m && !m.error && m.result !== undefined && m.result !== null && m.result !== "" && !(typeof m.result === "number" && Number.isNaN(m.result))) {
    return {
      kind: "math",
      pulse: true,
      totalMs: 3600,
      frames: [{ primary: String(m.result), secondary: "[MATH]", tone: "cyan" }],
    };
  }

  // 2) Built-in factual lookup
  for (const f of FACTS) {
    if (f.match.test(query)) {
      return {
        kind: "fact",
        pulse: true,
        totalMs: 3600,
        frames: [{ primary: f.answer, secondary: "[FACT]", tone: "cyan" }],
      };
    }
  }

  // 3) Web search results — sequential [FOUND] -> N -> [DONE]
  const ws = ctx?.web_search_results;
  if (ws && ws.results && ws.results.length > 0) {
    const total = ws.total_results || ws.results.length;
    return {
      kind: "search",
      pulse: false,
      totalMs: 3600,
      frames: [
        { primary: "[FOUND]", tone: "cyan" },
        { primary: String(total), secondary: "RESULTS", tone: "cyan" },
        { primary: "[DONE]", secondary: ws.results[0]?.title?.slice(0, 40) || "", tone: "cyan" },
      ],
    };
  }

  // 4) Layout-based completion states — all neon cyan
  if (layout === "comparison") {
    return { kind: "comparison", pulse: false, totalMs: 3600,
      frames: [{ primary: "[COMPLETE]", secondary: "VERDICT READY", tone: "cyan" }] };
  }
  if (layout === "financial") {
    return { kind: "financial", pulse: false, totalMs: 3600,
      frames: [{ primary: "[SIGNAL]", secondary: "ANALYSIS READY", tone: "cyan" }] };
  }
  if (layout === "list") {
    return { kind: "list", pulse: false, totalMs: 3600,
      frames: [{ primary: "[DONE]", secondary: "SOURCES READY", tone: "cyan" }] };
  }

  // 5) Universal fallback
  return {
    kind: "default",
    pulse: false,
    totalMs: 3600,
    frames: [{ primary: "[DONE]", secondary: "QUERY PROCESSED", tone: "cyan" }],
  };
}

const TONE_COLOR: Record<string, string> = {
  cyan: "#00e5ff",
  green: "#00ff88",
  yellow: "#ffd400",
  gray: "#8a93a3",
};

export default function QuickAnswerPopup({ query }: { query: string }) {
  const [spec, setSpec] = useState<PopupSpec | null>(null);
  const [frame, setFrame] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const startT = window.setTimeout(() => {
      const s = buildPopup(query);
      setSpec(s);
      setFrame(0);
      setVisible(true);
      try { navigator.vibrate?.(50); } catch {}

      const holdMs = s.totalMs - 800;
      const frameMs = Math.max(700, Math.floor(holdMs / s.frames.length));

      s.frames.forEach((_, i) => {
        if (i === 0) return;
        timers.push(window.setTimeout(() => setFrame(i), i * frameMs));
      });
      timers.push(window.setTimeout(() => setExiting(true), holdMs + 500));
      timers.push(window.setTimeout(() => setVisible(false), s.totalMs));
    }, 220);
    timers.push(startT);

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [query]);

  if (!visible || !spec) return null;
  const f = spec.frames[Math.min(frame, spec.frames.length - 1)];
  const color = TONE_COLOR[f.tone];

  return (
    <div
      className="quick-answer-popup pointer-events-none fixed left-1/2 top-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2"
      style={{
        animation: exiting
          ? "qa-exit 0.5s ease-in forwards"
          : `qa-enter 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) forwards${spec.pulse ? ", qa-pulse 1.4s ease-in-out 0.5s infinite" : ""}`,
      }}
    >
      <div
        className="rounded-lg border backdrop-blur-md flex flex-col items-center"
        style={{
          background: "rgba(10, 12, 16, 0.95)",
          borderColor: `${color}55`,
          padding: "clamp(8px, 2vw, 16px) clamp(16px, 4vw, 32px)",
          boxShadow: `0 0 30px ${color}66, inset 0 0 20px ${color}22`,
        }}
      >
        <div
          className="font-mono font-bold tracking-wide"
          style={{
            color,
            fontSize: "clamp(1.5rem, 8vw, 3rem)",
            textShadow: `0 0 12px ${color}aa`,
            lineHeight: 1.05,
          }}
          key={`p-${frame}`}
        >
          {f.primary}
          <span className="ml-2 inline-block" style={{ animation: "qa-blink 1s steps(2) infinite" }}>_</span>
        </div>
        {f.secondary && (
          <div
            className="font-mono mt-1 tracking-[0.3em]"
            style={{ color: "#8a93a3", fontSize: "0.7rem" }}
            key={`s-${frame}`}
          >
            {f.secondary}
          </div>
        )}
      </div>
      <style>{`
        @keyframes qa-enter {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes qa-exit {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to   { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
        @keyframes qa-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50%      { transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes qa-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
