// Function Box — internal intelligence layer for OKAY.
// Hosts: context manager, math module, web search module, exports.
// Users never see this directly. Inspect via /functionbox.

import { evaluate } from "mathjs";

export type LayoutType = "comparison" | "financial" | "list" | "default";

export interface TimeContext {
  iso: string;
  local: string;
  timestamp: number;
  timezone: string;
  date_readable: string;
}

export interface OkayContext {
  current_query: {
    raw: string;
    timestamp: string;
    layout_type: LayoutType;
    functions_used: string[];
  };
  current_time: TimeContext | null;
  structured_data: any;
  exports: {
    json: string | null;
    markdown: string | null;
    csv: string | null;
    plaintext: string | null;
  };
  math_result: MathResult | null;
  web_search_results: SearchResult | null;
}

export interface MathResult {
  expression: string;
  result: number | string;
  formatted: string;
  error?: string;
}

export interface SearchResultItem {
  rank: number;
  title: string;
  description: string;
  url: string;
  source: string;
  freshness_seconds: number;
  confidence_score: number; // 0..1
}

export interface SearchResult {
  mode: "firecrawl" | "mock";
  results: SearchResultItem[];
  total_results: number;
  cached: boolean;
  timestamp: string;
  query: string;
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "unknown"; }
}
function enrichResults(query: string, raw: { title: string; description: string; url: string }[]): SearchResultItem[] {
  return raw.map((r, i) => ({
    rank: i + 1,
    title: r.title,
    description: r.description,
    url: r.url,
    source: r.url && r.url !== "#" ? domainOf(r.url) : "synthesized",
    freshness_seconds: 60 + ((seed(query + i) % 86_000)),
    confidence_score: Math.max(0.55, Math.min(0.97, 0.7 + ((seed(query + "c" + i) % 30) / 100))),
  }));
}

declare global {
  interface Window {
    __okay_context: OkayContext;
    __okay_listeners?: Array<() => void>;
  }
}

// ---------- Context bootstrap ----------
function emptyContext(): OkayContext {
  return {
    current_query: { raw: "", timestamp: "", layout_type: "default", functions_used: [] },
    current_time: null,
    structured_data: {},
    exports: { json: null, markdown: null, csv: null, plaintext: null },
    math_result: null,
    web_search_results: null,
  };
}

if (typeof window !== "undefined" && !window.__okay_context) {
  window.__okay_context = emptyContext();
  window.__okay_listeners = [];
}

export function subscribeContext(cb: () => void): () => void {
  window.__okay_listeners = window.__okay_listeners || [];
  window.__okay_listeners.push(cb);
  return () => {
    window.__okay_listeners = (window.__okay_listeners || []).filter((f) => f !== cb);
  };
}

function notify() {
  (window.__okay_listeners || []).forEach((f) => {
    try { f(); } catch {}
  });
}

export function getContext(): OkayContext {
  return window.__okay_context;
}

export function resetContext() {
  window.__okay_context = emptyContext();
  notify();
}

// ---------- Layout detection ----------
export function detectLayout(q: string): LayoutType {
  const s = q.toLowerCase();
  if (/\b(vs|versus|compare|comparison|better than|or)\b/.test(s) && s.split(/\s+/).length > 2) return "comparison";
  if (/\b(price|stock|crypto|gold|btc|eth|market|bullish|bearish|forecast|invest)\b/.test(s)) return "financial";
  if (/\b(list|top|best|sources|where|find|stream|watch|channels?)\b/.test(s)) return "list";
  return "default";
}

// ---------- Math module ----------
const MATH_TRIGGERS = /(\d|\bsqrt\b|\bpi\b|\be\b|\bprobability\b|%|\bof\b|\+|-|\*|\/|\^)/i;

export function isMathQuery(q: string): boolean {
  const s = q.trim();
  // Reject obvious english queries
  if (/\b(who|what is the (best|capital|meaning)|why|how do|history|news|weather)\b/i.test(s)) return false;
  if (isTimeQuery(s)) return false;
  return MATH_TRIGGERS.test(s) && /\d|sqrt|pi/i.test(s);
}

function naturalToExpression(raw: string): string {
  let s = raw.toLowerCase().trim();
  s = s.replace(/^(what'?s?|whats|calculate|compute|evaluate|solve)\s+/i, "");
  s = s.replace(/\?+$/g, "").trim();

  // "X% of Y" => (X/100)*Y
  s = s.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, "($1/100)*$2");
  // "square root of X" => sqrt(X)
  s = s.replace(/square\s+root\s+of\s+(\d+(?:\.\d+)?)/gi, "sqrt($1)");
  // "probability of heads/tails twice/thrice"
  s = s.replace(/probability\s+of\s+(heads|tails)\s+(twice|two times)/gi, "0.5*0.5");
  s = s.replace(/probability\s+of\s+(heads|tails)\s+(thrice|three times)/gi, "0.5*0.5*0.5");
  // "probability of rolling a N twice/thrice"
  s = s.replace(/probability\s+of\s+rolling\s+(?:a\s+)?(\d+)\s+(twice|two times)/gi, "(1/6)*(1/6)");
  s = s.replace(/probability\s+of\s+rolling\s+(?:a\s+)?(\d+)\s+(thrice|three times)/gi, "(1/6)*(1/6)*(1/6)");
  // Strip trailing english
  s = s.replace(/\s+please\b.*$/i, "");
  return s.trim();
}

export function runMath(raw: string): MathResult {
  const expr = naturalToExpression(raw);
  try {
    const r = evaluate(expr);
    const value = typeof r === "number" ? Math.round(r * 1e8) / 1e8 : String(r);
    const result: MathResult = {
      expression: expr,
      result: value,
      formatted: `> ${raw} = ${value}`,
    };
    window.__okay_context.math_result = result;
    notify();
    return result;
  } catch (e: any) {
    const result: MathResult = {
      expression: expr,
      result: NaN,
      formatted: "> INVALID EXPRESSION. Try: 2+2, 15% of 200, sqrt(16)",
      error: e?.message ?? "parse error",
    };
    window.__okay_context.math_result = result;
    notify();
    return result;
  }
}

// ---------- Web search module ----------
const FC_KEY_LS = "okay.firecrawl.key";
const FC_MODE_LS = "okay.search.mode"; // "mock" | "real"
const searchCache = new Map<string, { ts: number; data: SearchResult }>();
const TTL_MS = 60 * 60 * 1000;

export function getFirecrawlKey(): string {
  try { return localStorage.getItem(FC_KEY_LS) || ""; } catch { return ""; }
}
export function setFirecrawlKey(k: string) {
  try { localStorage.setItem(FC_KEY_LS, k); } catch {}
}
export function getSearchMode(): "mock" | "real" {
  try { return (localStorage.getItem(FC_MODE_LS) as any) || "real"; } catch { return "real"; }
}
export function setSearchMode(m: "mock" | "real") {
  try { localStorage.setItem(FC_MODE_LS, m); } catch {}
}
export function clearSearchCache() {
  searchCache.clear();
}

export function isSearchQuery(q: string): boolean {
  // Trigger web search for any non-trivial natural-language query, except pure math/time.
  if (isMathQuery(q) && q.trim().split(/\s+/).length <= 6) return false;
  if (isTimeQuery(q)) return false;
  return q.trim().split(/\s+/).length >= 2;
}

export function isTimeQuery(q: string): boolean {
  const s = q.trim().toLowerCase();
  return /\b(what(?:'s|s|\s+is)?\s+(?:the\s+)?(?:time|date|day))\b/.test(s)
    || /\b(current\s+(?:time|date|day))\b/.test(s)
    || /\b(today'?s\s+date)\b/.test(s)
    || /\b(what\s+day\s+is\s+(?:it|today))\b/.test(s)
    || /^time\??$/.test(s)
    || /^date\??$/.test(s);
}

function mockSearch(query: string): SearchResult {
  const raw = [
    { title: `Live signals & analysis: ${query}`, description: `Aggregated overview of recent activity related to "${query}". Includes current indicators, momentum, and source-of-truth references.`, url: "https://investing.com/example" },
    { title: `${query} — Latest market intelligence`, description: `Top analysts weigh in on the current state of ${query}. Updated continuously by the OKAY mesh.`, url: "https://ft.com/example" },
    { title: `${query} — Real-time data feed`, description: `Comprehensive feed of indicators and references with confidence-weighted ranking.`, url: "https://kitco.com/example" },
  ];
  return {
    mode: "mock",
    cached: false,
    timestamp: new Date().toISOString(),
    query,
    total_results: 12,
    results: enrichResults(query, raw),
  };
}

export async function runWebSearch(query: string): Promise<SearchResult> {
  const key = query.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    const data = { ...cached.data, cached: true };
    window.__okay_context.web_search_results = data;
    notify();
    return data;
  }

  const mode = getSearchMode();
  let data: SearchResult;

  if (mode !== "mock") {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firecrawl-search`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query, limit: 5 }),
      });
      if (!resp.ok) throw new Error(`firecrawl-search ${resp.status}`);
      const json = await resp.json();
      const raw = Array.isArray(json?.results) ? json.results : [];
      if (raw.length === 0) throw new Error("no results");
      data = {
        mode: "firecrawl",
        results: enrichResults(query, raw),
        total_results: raw.length,
        cached: false,
        timestamp: new Date().toISOString(),
        query,
      };
    } catch (e) {
      console.warn("[OKAY] firecrawl failed, falling back to mock", e);
      data = mockSearch(query);
    }
  } else {
    data = mockSearch(query);
  }

  searchCache.set(key, { ts: Date.now(), data });
  window.__okay_context.web_search_results = data;
  notify();
  return data;
}

export function captureTimeContext(): TimeContext {
  const now = new Date();
  const tc: TimeContext = {
    iso: now.toISOString(),
    local: now.toLocaleString(),
    timestamp: now.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    date_readable: now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
  if (typeof window !== "undefined") {
    window.__okay_context.current_time = tc;
    notify();
  }
  return tc;
}

// ---------- Structured data builders (mock-shaped per layout) ----------
function seed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function rng(s: string, n: number, max = 100, min = 0) {
  return min + (seed(s + n) % (max - min));
}

export function buildStructuredData(query: string, layout: LayoutType): any {
  if (layout === "comparison") {
    const parts = query.split(/\s+(?:vs|versus|or)\s+/i);
    const a = (parts[0] || "Option A").replace(/^(compare|which is better)\s+/i, "").trim();
    const b = (parts[1] || "Option B").trim();
    const ca = rng(a, 1, 99, 70);
    const cb = rng(b, 2, 99, 70);
    return {
      entities: [
        { name: a, metrics: { camera: rng(a, 3, 99, 70), battery: rng(a, 4, 99, 70), price: 600 + rng(a, 5, 500) } },
        { name: b, metrics: { camera: rng(b, 6, 99, 70), battery: rng(b, 7, 99, 70), price: 600 + rng(b, 8, 500) } },
      ],
      verdict: ca >= cb ? a : b,
      confidence: Math.round((Math.max(ca, cb) / 100) * 100) / 100,
    };
  }
  if (layout === "financial") {
    const asset = (query.match(/\b(gold|btc|eth|bitcoin|ethereum|silver|oil|tsla|aapl|nvda|sp500|nasdaq)\b/i) || [, "asset"])[1];
    return {
      asset,
      metrics: {
        spot_price: 1000 + rng(asset, 1, 5000),
        sentiment: rng(asset, 2, 2) ? "bullish" : "bearish",
        volatility: rng(asset, 3, 50) / 100,
        "24h_change": `${rng(asset, 4, 2) ? "+" : "-"}${(rng(asset, 5, 50) / 10).toFixed(2)}%`,
      },
      signals: [
        { name: "momentum", value: `+${(rng(asset, 6, 40) / 10).toFixed(2)}%`, status: "positive" },
        { name: "rsi", value: String(40 + rng(asset, 7, 40)), status: "neutral" },
      ],
    };
  }
  if (layout === "list") {
    return {
      category: "results",
      items: Array.from({ length: 5 }).map((_, i) => ({
        title: `Source ${i + 1}`,
        source: "synthesized",
        confidence: 70 + rng(query, i, 28),
        url: "#",
      })),
    };
  }
  return {
    key_facts: [
      { label: "topic", value: query },
      { label: "domain", value: "general knowledge" },
      { label: "confidence", value: `${70 + rng(query, 1, 28)}%` },
    ],
    metrics: {},
  };
}

// ---------- Export generators ----------
export function buildExports(ctx: OkayContext) {
  const data = ctx.structured_data || {};
  const json = JSON.stringify({ query: ctx.current_query, data, math: ctx.math_result, search: ctx.web_search_results }, null, 2);

  const flat = flatten(data);
  const csv = ["key,value", ...flat.map(([k, v]) => `${csvEscape(k)},${csvEscape(String(v))}`)].join("\n");

  const md = [
    `# OKAY — ${ctx.current_query.raw}`,
    `*Layout:* ${ctx.current_query.layout_type}  ·  *Time:* ${ctx.current_query.timestamp}`,
    "",
    "## Structured Data",
    "```json",
    JSON.stringify(data, null, 2),
    "```",
    ctx.math_result ? `\n## Math\n\`${ctx.math_result.expression}\` = **${ctx.math_result.result}**` : "",
    ctx.web_search_results ? `\n## Sources (${ctx.web_search_results.mode})\n` + ctx.web_search_results.results.map((r) => `- [${r.title}](${r.url}) — ${r.description}`).join("\n") : "",
  ].join("\n");

  const plain = [
    `OKAY :: ${ctx.current_query.raw}`,
    `Layout: ${ctx.current_query.layout_type}`,
    `Time: ${ctx.current_query.timestamp}`,
    "",
    ...flat.map(([k, v]) => `${k}: ${v}`),
    ctx.math_result ? `\nMath: ${ctx.math_result.formatted}` : "",
  ].join("\n");

  ctx.exports = { json, csv, markdown: md, plaintext: plain };
}

function flatten(obj: any, prefix = ""): [string, any][] {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") return [[prefix || "value", obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => flatten(v, `${prefix}[${i}]`));
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
}
function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------- Orchestrator: called from main flow ----------
export async function processQuery(query: string): Promise<{
  layout: LayoutType;
  functions: string[];
  logs: string[];
}> {
  const layout = detectLayout(query);
  const functions: string[] = [];
  const logs: string[] = [];

  // Time context — instant win, no API. Always inject.
  functions.push("time");
  const tc = captureTimeContext();
  logs.push(`> TIME LOCK: ${tc.date_readable}`);
  logs.push(`> TZ: ${tc.timezone}`);

  window.__okay_context.current_query = {
    raw: query,
    timestamp: new Date().toISOString(),
    layout_type: layout,
    functions_used: functions,
  };

  if (isMathQuery(query)) {
    functions.push("math");
    logs.push("> CALCULATING...");
    const m = runMath(query);
    logs.push(`> PARSING EXPRESSION: ${m.expression}`);
    logs.push(m.error ? "> INVALID EXPRESSION" : `> RESULT: ${m.result}`);
  }

  if (isSearchQuery(query)) {
    functions.push("web_search");
    const key = query.trim().toLowerCase();
    const wasCached = (() => {
      const c = searchCache.get(key);
      return !!(c && Date.now() - c.ts < TTL_MS);
    })();
    logs.push("> WEB SEARCH: QUERYING...");
    if (wasCached) {
      logs.push("> CACHE HIT");
    } else {
    logs.push(`> FETCHING FROM ${getSearchMode() === "real" ? "FIRECRAWL" : "MOCK PROVIDER"}...`);
    }
    const r = await runWebSearch(query);
    logs.push(`> ${r.results.length} RESULTS FOUND`);
    if (!wasCached) logs.push("> CACHING FOR 1 HOUR");
  }

  window.__okay_context.structured_data = buildStructuredData(query, layout);
  buildExports(window.__okay_context);
  notify();
  return { layout, functions, logs };
}
