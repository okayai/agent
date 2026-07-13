import { supabase } from "@/integrations/supabase/client";
import type { BrowserAction, BrowserContext, BrowserWorker } from "./browser";
import type { PageSnapshot } from "./perception";

interface ContextResponse {
  context: { id: string; trustDomain: string };
  snapshot: PageSnapshot;
}

type Invoke = (
  functionName: string,
  options: { body: Record<string, unknown> },
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export class PlaywrightWorkerClient implements BrowserWorker {
  private readonly invoke: Invoke;

  constructor(invoke: Invoke = (name, options) => supabase.functions.invoke(name, options)) {
    this.invoke = invoke;
  }

  private async call<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.invoke("okay-browser", { body });
    if (error) throw new Error(error.message ?? "browser_gateway_error");
    if (data && typeof data === "object" && "error" in data) {
      throw new Error(String((data as { error: unknown }).error));
    }
    return data as T;
  }

  async newContext(trustDomain: string): Promise<BrowserContext> {
    const response = await this.call<ContextResponse>({ operation: "create", trustDomain });
    // Cookies, storage state, worker address, and worker credentials never enter
    // the browser bundle. They remain behind the authenticated gateway.
    return {
      id: response.context.id,
      trustDomain: response.context.trustDomain,
      cookies: [],
      storage: {},
    };
  }

  async navigate(context: BrowserContext, url: string): Promise<PageSnapshot> {
    return this.call({ operation: "navigate", contextId: context.id, url });
  }

  async perceive(context: BrowserContext): Promise<PageSnapshot> {
    return this.call({ operation: "snapshot", contextId: context.id });
  }

  async act(
    context: BrowserContext,
    action: BrowserAction,
  ): Promise<{ ok: boolean; newSnapshot: PageSnapshot; error?: string }> {
    return this.call({ operation: "action", contextId: context.id, action });
  }

  async close(context: BrowserContext): Promise<void> {
    await this.call({ operation: "close", contextId: context.id });
  }
}
