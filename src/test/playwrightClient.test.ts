import { describe, expect, it, vi } from "vitest";
import { PlaywrightWorkerClient } from "@/lib/okay/playwrightClient";

const snapshot = {
  page: { url: "about:blank", title: "", state_version: 1 },
  elements: [],
  frames: [],
};

describe("PlaywrightWorkerClient", () => {
  it("keeps worker credentials and session material behind the gateway", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        context: { id: "ctx-1", trustDomain: "financial" },
        snapshot,
      },
      error: null,
    });

    const client = new PlaywrightWorkerClient(invoke);
    const context = await client.newContext("financial");

    expect(context).toEqual({ id: "ctx-1", trustDomain: "financial", cookies: [], storage: {} });
    expect(invoke).toHaveBeenCalledWith("okay-browser", {
      body: { operation: "create", trustDomain: "financial" },
    });
    expect(JSON.stringify(invoke.mock.calls)).not.toContain("worker-token");
  });

  it("passes state-versioned actions through the authenticated gateway", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { ok: false, error: "stale_state_version", newSnapshot: snapshot },
      error: null,
    });
    const client = new PlaywrightWorkerClient(invoke);

    const result = await client.act(
      { id: "ctx-1", trustDomain: "research", cookies: [], storage: {} },
      { kind: "click", element_id: "e-1", state_version: 0 },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("stale_state_version");
    expect(invoke).toHaveBeenCalledWith("okay-browser", {
      body: {
        operation: "action",
        contextId: "ctx-1",
        action: { kind: "click", element_id: "e-1", state_version: 0 },
      },
    });
  });

  it("surfaces gateway failures without exposing internals", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "authentication_required" },
    });
    const client = new PlaywrightWorkerClient(invoke);
    await expect(client.newContext("research")).rejects.toThrow("authentication_required");
  });
});
