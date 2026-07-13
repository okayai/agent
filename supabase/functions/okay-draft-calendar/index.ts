// Spec §1 — Calendar drafting capability worker (drafts only)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You draft a calendar invitation as strict JSON:
{ "start": "<ISO 8601>", "end": "<ISO 8601>", "description": "<short>" }
Never send or publish. Never invent attendee identities. Output JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { title, when, attendees, timezone } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Title: ${title}\nWhen: ${when}\nTimezone: ${timezone}\nAttendees: ${(attendees ?? []).join(", ")}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: r.status === 429 ? "rate_limited" : "upstream_error" }),
      { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = await r.json();
    let parsed: { start?: string; end?: string; description?: string } = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
    return new Response(JSON.stringify({
      id: crypto.randomUUID(),
      title: String(title ?? "").slice(0, 200),
      start: String(parsed.start ?? new Date().toISOString()),
      end: String(parsed.end ?? new Date(Date.now() + 3600e3).toISOString()),
      attendees: Array.isArray(attendees) ? attendees.slice(0, 50).map(String) : [],
      timezone: String(timezone ?? "UTC"),
      description: String(parsed.description ?? "").slice(0, 4000),
      createdAt: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
