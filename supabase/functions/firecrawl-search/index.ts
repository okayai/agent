// Firecrawl /v2/search proxy. Keeps API key server-side.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit } = await req.json();
    const q = String(query ?? "").slice(0, 500).trim();
    if (!q) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing", mock: true }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q, limit: Math.min(Math.max(Number(limit) || 5, 1), 10), sources: ["web"] }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("firecrawl error", resp.status, text);
      return new Response(JSON.stringify({ error: `firecrawl ${resp.status}`, detail: text.slice(0, 400) }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any = {};
    try { data = JSON.parse(text); } catch { data = {}; }

    // v2 returns { success, data: { web: [{ url, title, description, ... }] } } or similar
    const webArr = Array.isArray(data?.data?.web)
      ? data.data.web
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results)
      ? data.results
      : [];

    const results = webArr.slice(0, 10).map((r: any) => ({
      title: r.title || r.metadata?.title || "Untitled",
      description: r.description || r.snippet || r.metadata?.description || "",
      url: r.url || r.metadata?.sourceURL || "#",
    }));

    return new Response(JSON.stringify({ results, total: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("firecrawl-search error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
