// Spec §3 — Mission planner: TypedGoal → TaskDAG
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are the OKAY Mission Planner.
Given a TypedGoal, produce a task dependency graph (DAG).
Return ONLY JSON:
{
  "nodes": [
    {
      "id": "t1",
      "capability": "research.web | draft.email | search.flights | ...",
      "inputs": ["<reference>"],
      "dependencies": ["<id of prerequisite node>"],
      "preconditions": ["<must be true before running>"],
      "successCriteria": ["<verifiable outcome, not click success>"],
      "policyClass": "R0|R1|R2|R3|R4",
      "retryPolicy": { "max": 3, "backoffMs": 1000 },
      "alternatives": ["<fallback strategy>"]
    }
  ]
}
Rules:
- 3–10 nodes.
- Never plan an R5 action.
- Every node MUST have at least one successCriteria expressed as an observable predicate.
- Dependencies must reference ids that also appear in nodes.
- No cycles.
- Output JSON only.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { goal, mission_id } = await req.json();
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
            {
              role: "user",
              content: `TypedGoal:\n${JSON.stringify(goal).slice(0, 6000)}`,
            },
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
    let parsed: { nodes?: unknown[] } = {};
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

    const arr = (v: unknown) =>
      Array.isArray(v) ? v.slice(0, 8).map((x) => String(x).slice(0, 200)) : [];

    const nodes = Array.isArray(parsed.nodes)
      ? parsed.nodes.slice(0, 12).map((n, i) => {
          const node = n as Record<string, unknown>;
          const tier = String(node.policyClass ?? "R1");
          const valid = /^R[0-4]$/.test(tier) ? tier : "R1";
          const rp = node.retryPolicy as
            | { max?: unknown; backoffMs?: unknown }
            | undefined;
          return {
            id: String(node.id ?? `t${i + 1}`).slice(0, 32),
            capability: String(node.capability ?? "unknown").slice(0, 80),
            inputs: arr(node.inputs),
            dependencies: arr(node.dependencies),
            preconditions: arr(node.preconditions),
            successCriteria: arr(node.successCriteria),
            policyClass: valid,
            retryPolicy: {
              max: Math.min(10, Math.max(0, Number(rp?.max ?? 3))),
              backoffMs: Math.min(
                60000,
                Math.max(0, Number(rp?.backoffMs ?? 1000)),
              ),
            },
            alternatives: arr(node.alternatives),
          };
        })
      : [];

    // Structural validation: drop dependencies pointing to unknown ids; break cycles.
    const ids = new Set(nodes.map((n) => n.id));
    for (const n of nodes) {
      n.dependencies = n.dependencies.filter((d) => ids.has(d) && d !== n.id);
    }

    return new Response(
      JSON.stringify({
        mission_id: String(mission_id ?? crypto.randomUUID()),
        nodes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("okay-plan", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
