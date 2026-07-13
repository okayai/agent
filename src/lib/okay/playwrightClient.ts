import type { BrowserAction, BrowserContext, BrowserWorker } from "./browser";
import type { PageSnapshot } from "./perception";

export interface PlaywrightWorkerClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

interface ContextResponse {
  context: { id: string; trustDomain: string };
  snapshot: PageSnapshot;
}

export class PlaywrightWorkerClient implements BrowserWorker {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly request: typeof fetch;

  constructor(options: PlaywrightWorkerClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.request = options.fetchImpl ?? fetch;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });

    const payload = await response.json().catch(() => ({ error: "invalid_worker_response" }));
    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : `worker_http_${response.status}`);
    }
    return payload as T;
  }

  async health(): Promise<{ ok: boolean; browserConnected: boolean; contexts: number }> {
    return this.call("/health");
  }

  async newContext(trustDomain: string): Promise<BrowserContext> {
    const response = await this.call<ContextResponse>("/v1/contexts", {
      method: "POST",
      body: JSON.stringify({ trustDomain }),
    });
    // Secret-bearing cookies and storage state intentionally remain in the worker.
    return {
      id: response.context.id,
      trustDomain: response.context.trustDomain,
      cookies: [],
      storage: {},
    };
  }

  async navigate(context: BrowserContext, url: string): Promise<PageSnapshot> {
    return this.call(`/v1/contexts/${encodeURIComponent(context.id)}/navigate`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  async perceive(context: BrowserContext): Promise<PageSnapshot> {
    return this.call(`/v1/contexts/${encodeURIComponent(context.id)}/snapshot`);
  }

  async act(
    context: BrowserContext,
    action: BrowserAction,
  ): Promise<{ ok: boolean; newSnapshot: PageSnapshot; error?: string }> {
    return this.call(`/v1/contexts/${encodeURIComponent(context.id)}/actions`, {
      method: "POST",
      body: JSON.stringify(action),
    });
  }

  async close(context: BrowserContext): Promise<void> {
    await this.call(`/v1/contexts/${encodeURIComponent(context.id)}`, { method: "DELETE" });
  }
}
