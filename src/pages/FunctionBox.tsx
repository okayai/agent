// /functionbox — internal developer panel.
// Terminal-style, ugly-but-functional. No auth (v1).
import { useEffect, useMemo, useState } from "react";
import {
  getContext, subscribeContext, runMath, runWebSearch,
  getFirecrawlKey, setFirecrawlKey, getSearchMode, setSearchMode,
  clearSearchCache, processQuery, buildExports,
} from "@/lib/functionBox";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function FunctionBox() {
  const [, force] = useState(0);
  useEffect(() => subscribeContext(() => force((n) => n + 1)), []);

  const ctx = getContext();
  const [query, setQuery] = useState(ctx.current_query.raw);
  const [mathInput, setMathInput] = useState("15% of 200");
  const [searchInput, setSearchInput] = useState("latest AI news");
  const [apiKey, setApiKey] = useState(getFirecrawlKey());
  const [showKey, setShowKey] = useState(false);
  const [mode, setMode] = useState<"mock" | "real">(getSearchMode());

  useEffect(() => { setQuery(ctx.current_query.raw); }, [ctx.current_query.raw]);

  const mathLoaded = typeof (window as any).math !== "undefined" || true; // mathjs imported as module

  const rerun = async () => {
    if (!query.trim()) return;
    await processQuery(query.trim());
    force((n) => n + 1);
  };

  const onMath = () => { runMath(mathInput); force((n) => n + 1); };
  const onSearch = async () => { await runWebSearch(searchInput); force((n) => n + 1); };

  const exportsReady = useMemo(() => {
    if (!ctx.exports.json) buildExports(ctx);
    return ctx.exports;
  }, [ctx]);

  const k = "text-[#7fffd4]";
  const dim = "text-[#7a8a85]";
  const box = "border border-[#1f3a32] bg-[#0a120e] p-3 rounded";

  return (
    <div className="min-h-screen bg-black text-[#9effc9] font-mono text-xs p-4 space-y-4">
      <header className="border-b border-[#1f3a32] pb-2 flex items-center justify-between">
        <div>
          <div className="text-base tracking-[0.3em]">OKAY :: FUNCTION BOX</div>
          <div className={dim}>internal · v1 · do not link from main UI</div>
        </div>
        <a href="/" className={`${k} underline`}>← back to /</a>
      </header>

      {/* A. Query Controls */}
      <section className={box}>
        <div className={`${k} mb-2`}>// A. QUERY &amp; CONTROLS</div>
        <textarea
          value={query} onChange={(e) => setQuery(e.target.value)}
          rows={2}
          className="w-full bg-black border border-[#1f3a32] p-2 text-[#9effc9] resize-y"
          placeholder="enter query…"
        />
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <button onClick={rerun} className="border border-[#1f3a32] px-3 py-1 hover:bg-[#0f1f18]">[ RE-RUN ]</button>
          <label className="flex items-center gap-2 ml-4">
            <input type="checkbox" checked={mode === "mock"} onChange={(e) => { const m = e.target.checked ? "mock" : "real"; setMode(m); setSearchMode(m); }} />
            mock web search
          </label>
          <label className="flex items-center gap-2">
            firecrawl key:
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setFirecrawlKey(e.target.value); }}
              placeholder="fc-…"
              className="bg-black border border-[#1f3a32] px-2 py-0.5 w-48"
            />
            <button onClick={() => setShowKey((s) => !s)} className={dim}>{showKey ? "hide" : "show"}</button>
          </label>
        </div>
      </section>

      {/* B. Context JSON */}
      <section className={box}>
        <div className="flex items-center justify-between mb-2">
          <div className={k}>// B. window.__okay_context</div>
          <button
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(ctx, null, 2))}
            className="border border-[#1f3a32] px-2 py-0.5">[ copy ]</button>
        </div>
        <pre className="overflow-auto max-h-80 text-[11px] leading-snug whitespace-pre-wrap">{JSON.stringify(ctx, null, 2)}</pre>
      </section>

      {/* C + D side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className={box}>
          <div className={`${k} mb-2`}>// C. MATH MODULE</div>
          <div className={dim}>last:</div>
          <pre className="text-[11px] mb-2">{ctx.math_result ? JSON.stringify(ctx.math_result, null, 2) : "—"}</pre>
          <div className="flex gap-2">
            <input value={mathInput} onChange={(e) => setMathInput(e.target.value)}
              className="flex-1 bg-black border border-[#1f3a32] px-2 py-1" />
            <button onClick={onMath} className="border border-[#1f3a32] px-3">[ EVAL ]</button>
          </div>
        </section>

        <section className={box}>
          <div className={`${k} mb-2`}>// D. WEB SEARCH</div>
          <div className={dim}>
            mode: <span className={k}>{mode}</span> · cached: <span className={k}>{String(ctx.web_search_results?.cached ?? "—")}</span> · ts: {ctx.web_search_results?.timestamp ?? "—"}
          </div>
          <pre className="text-[11px] my-2 max-h-40 overflow-auto">{ctx.web_search_results ? JSON.stringify(ctx.web_search_results.results, null, 2) : "—"}</pre>
          <div className="flex gap-2">
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-black border border-[#1f3a32] px-2 py-1" />
            <button onClick={onSearch} className="border border-[#1f3a32] px-3">[ SEARCH ]</button>
            <button onClick={() => { clearSearchCache(); force((n) => n + 1); }} className="border border-[#1f3a32] px-3">[ CLEAR CACHE ]</button>
          </div>
        </section>
      </div>

      {/* E. Exports */}
      <section className={box}>
        <div className={`${k} mb-2`}>// E. EXPORTS</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => download("okay.json", exportsReady.json || "{}", "application/json")} className="border border-[#1f3a32] px-3 py-1">[ JSON ]</button>
          <button onClick={() => download("okay.csv", exportsReady.csv || "", "text/csv")} className="border border-[#1f3a32] px-3 py-1">[ CSV ]</button>
          <button onClick={() => download("okay.md", exportsReady.markdown || "", "text/markdown")} className="border border-[#1f3a32] px-3 py-1">[ MARKDOWN ]</button>
          <button onClick={() => download("okay.txt", exportsReady.plaintext || "", "text/plain")} className="border border-[#1f3a32] px-3 py-1">[ PLAINTEXT ]</button>
        </div>
      </section>

      {/* F + G */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className={box}>
          <div className={`${k} mb-2`}>// F. SESSION INFO</div>
          <div>last query ts: <span className={k}>{ctx.current_query.timestamp || "—"}</span></div>
          <div>functions used: <span className={k}>{ctx.current_query.functions_used.join(", ") || "—"}</span></div>
          <div>layout detected: <span className={k}>{ctx.current_query.layout_type}</span></div>
        </section>
        <section className={box}>
          <div className={`${k} mb-2`}>// G. SYSTEM STATUS</div>
          <div>math.js loaded: <span className={k}>{mathLoaded ? "✅" : "❌"}</span></div>
          <div>firecrawl api key: <span className={k}>{apiKey ? "present" : "missing"}</span></div>
          <div>web search mode: <span className={k}>{mode}</span></div>
        </section>
      </div>

      <footer className={`${dim} pt-2 border-t border-[#1f3a32]`}>
        test: visit <span className={k}>/</span>, ask <span className={k}>"what's 15% of 200"</span>, then return here.
      </footer>
    </div>
  );
}
