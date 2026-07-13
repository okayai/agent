import { describe, expect, it, vi } from "vitest";
import { PlaywrightWorkerClient } from "@/lib/okay/playwrightClient";

const snapshot = {
  page: { url: "about:blank", title: "", state_version: 1 },
  elements: [],
  frames: [],
};

describe("PlaywrightWorkerClient", () => {
  it("keeps session material in the worker", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      context: { id: "ctx-1", trustDomain: "financial" },
      snapshot,
    }), { status: 201, headers: { "content-type": "application/json" } }));

    const client = new PlaywrightWorkerClient({
      baseUrl: "https://worker.example/",
      token: "opaque-token",
      fetchImpl,
    });
    const context = await client.newContext("financial");

    expect(context).toEqual({ id: "ctx-1", trustDomain: "financial", cookies: [], storage: {} });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://worker.example/v1/contexts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer opaque-token" }),
      }),
    );
  });

  it("passes state-versioned actions to the worker", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: "stale_state_version",
      newSnapshot: snapshot,
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new PlaywrightWorkerClient({
      baseUrl: "https://worker.example",
      token: "token",
      fetchImpl,
    });

    const result = await client.act(
      { id: "ctx-1", trustDomain: "research", cookies: [], storage: {} },
      { kind: "click", element_id: "e-1", state_version: 0 },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("stale_state_version");
  });
});
