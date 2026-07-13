// Spec §1 — Document drafting capability worker (markdown draft)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You draft a document in Markdown, returning strict JSON:
{ "markdown": "<full markdown document, headings, sections>" }
Never publish. Output JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { title, outline, audience } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Title: ${title}\nAudience: ${audience ?? "general"}\nOutline:\n${(outline ?? []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: r.status === 429 ? "rate_limited" : "upstream_error" }),
      { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = await r.json();
    let parsed: { markdown?: string } = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      title: String(title ?? "").slice(0, 200),
      markdown: String(parsed.markdown ?? "").slice(0, 20000),
      createdAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
