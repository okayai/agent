// Spec §1 — Email drafting capability worker (drafts only, no send)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You draft a professional email as strict JSON:
{ "subject": "<concise>", "body": "<plain text email body>" }
Do NOT send anything. Do NOT invent recipient details. Output JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { to, intent, context } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Recipients: ${(to ?? []).join(", ")}\nIntent: ${intent ?? ""}\nContext: ${context ?? ""}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.status === 429 ? "rate_limited" : r.status === 402 ? "credits_depleted" : "upstream_error" }),
        { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await r.json();
    let parsed: { subject?: string; body?: string } = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      to: Array.isArray(to) ? to.slice(0, 20).map(String) : [],
      subject: String(parsed.subject ?? "").slice(0, 200),
      body: String(parsed.body ?? "").slice(0, 8000),
      createdAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
