import { useEffect, useState } from "react";
import { getContext, subscribeContext, type SearchResult } from "@/lib/functionBox";

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function SearchResultsCard() {
  const [data, setData] = useState<SearchResult | null>(null);

  useEffect(() => {
    const sync = () => setData(getContext()?.web_search_results ?? null);
    sync();
    return subscribeContext(sync);
  }, []);

  if (!data || !data.results?.length) return null;
  const visible = data.results.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.3em] text-primary font-mono">
          // LIVE WEB RESULTS · <span className="text-foreground/70">"{data.query}"</span>
        </div>
        <div className="flex gap-2 text-[9px] tracking-[0.3em] text-muted-foreground">
          <span className={data.mode === "firecrawl" ? "text-primary" : "text-warning"}>●</span>
          <span>{data.mode === "firecrawl" ? "FIRECRAWL · LIVE" : "MOCK"}</span>
          {data.cached && <span className="text-primary/70">· CACHED</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="cosmic-card rounded-lg p-4 backdrop-blur block hover:border-primary/60 hover:-translate-y-0.5 transition-all group"
            style={{ animation: `fade-in 0.4s ease-out ${i * 70}ms both` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-primary font-mono text-[10px] tracking-widest">[{String(r.rank).padStart(2, "0")}]</span>
              <span className="text-[9px] font-mono tracking-[0.2em] text-muted-foreground truncate max-w-[60%]">
                {domain(r.url)}
              </span>
            </div>
            <div className="font-display text-base text-foreground/95 leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {r.title}
            </div>
            <div className="mt-2 text-xs text-foreground/70 leading-relaxed line-clamp-3">
              {r.description}
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] font-mono tracking-[0.2em]">
              <span className="text-primary/70 truncate max-w-[70%]">▸ {r.url.replace(/^https?:\/\//, "").slice(0, 48)}</span>
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">OPEN ⤴</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
