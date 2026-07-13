const configuredOrigin = Deno.env.get("OKAY_APP_ORIGIN") ?? "";

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": configuredOrigin && origin === configuredOrigin ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

async function authenticatedUserId(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authorization || !supabaseUrl || !anonKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" && /^[0-9a-f-]{36}$/i.test(user.id) ? user.id : null;
}

function contextId(value: unknown): string {
  const id = String(value ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    const error = new Error("invalid_context_id");
    Object.assign(error, { status: 400 });
    throw error;
  }
  return id;
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  const requestOrigin = req.headers.get("origin") ?? "";
  if (!configuredOrigin || requestOrigin !== configuredOrigin) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const owner = await authenticatedUserId(req);
    if (!owner) {
      return new Response(JSON.stringify({ error: "authentication_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const workerUrl = Deno.env.get("PLAYWRIGHT_WORKER_URL")?.replace(/\/$/, "");
    const workerToken = Deno.env.get("PLAYWRIGHT_WORKER_TOKEN");
    if (!workerUrl || !workerToken) throw new Error("playwright_worker_not_configured");

    const input = await req.json();
    let path: string;
    let method = "POST";
    let payload: unknown;

    switch (input?.operation) {
      case "create":
        path = "/v1/contexts";
        payload = { trustDomain: String(input.trustDomain ?? "research").slice(0, 40) };
        break;
      case "navigate":
        path = `/v1/contexts/${contextId(input.contextId)}/navigate`;
        payload = { url: String(input.url ?? "").slice(0, 8192) };
        break;
      case "snapshot":
        path = `/v1/contexts/${contextId(input.contextId)}/snapshot`;
        method = "GET";
        break;
      case "action":
        path = `/v1/contexts/${contextId(input.contextId)}/actions`;
        payload = input.action;
        break;
      case "close":
        path = `/v1/contexts/${contextId(input.contextId)}`;
        method = "DELETE";
        break;
      default:
        return new Response(JSON.stringify({ error: "unsupported_operation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch(`${workerUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${workerToken}`,
        "Content-Type": "application/json",
        "X-Okay-Owner": owner,
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("okay-browser", error);
    const status = Number((error as { status?: number }).status ?? 500);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
