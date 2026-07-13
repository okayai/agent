// Spec §3 — Intent interpreter: directive → TypedGoal with classified unknowns
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are the OKAY Intent Interpreter.
Convert the user's directive into a strict TypedGoal JSON contract.
Return ONLY JSON matching this shape:
{
  "goal": "<one-sentence restatement>",
  "deliverables": ["<concrete artifact 1>", "..."],
  "constraints": { "<key>": "<value>" },
  "unknowns": {
    "blocking":    ["<cannot proceed safely without>"],
    "deferrable":  ["<can begin while resolving>"],
    "inferable":   ["<high-confidence from context>"],
    "defaultable": ["<reversible standard default is fine>"]
  }
}
Rules:
- Classify EVERY unknown into exactly one bucket.
- Blocking questions are only those where proceeding would be unsafe or meaningless.
- Never invent identities, recipients, or credentials — those are always blocking or inferable.
- Output JSON only, no prose.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { directive } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: String(directive ?? "").slice(0, 4000) },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "credits_depleted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await response.text();
      console.error("gateway", response.status, t);
      return new Response(JSON.stringify({ error: "upstream_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }

    const u = (parsed as { unknowns?: Record<string, unknown> }).unknowns ?? {};
    const arr = (v: unknown) =>
      Array.isArray(v) ? v.slice(0, 10).map((x) => String(x).slice(0, 200)) : [];

    const out = {
      goal: String(parsed.goal ?? "").slice(0, 400),
      deliverables: arr((parsed as { deliverables?: unknown }).deliverables),
      constraints:
        parsed.constraints && typeof parsed.constraints === "object"
          ? (parsed.constraints as Record<string, unknown>)
          : {},
      unknowns: {
        blocking: arr((u as { blocking?: unknown }).blocking),
        deferrable: arr((u as { deferrable?: unknown }).deferrable),
        inferable: arr((u as { inferable?: unknown }).inferable),
        defaultable: arr((u as { defaultable?: unknown }).defaultable),
      },
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("okay-interpret", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
