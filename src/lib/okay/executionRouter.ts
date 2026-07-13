// Spec §4 — Priority router: API → connector → DOM → visual → handoff
export type ExecutionChannel = "api" | "connector" | "dom" | "visual" | "handoff";

export interface CapabilityDescriptor {
  capability: string;
  api?: { endpoint: string; auth: "oauth" | "apikey" | "none" };
  connector?: { name: string };
  domSelector?: boolean;
  visualHint?: boolean;
}

export interface RouteDecision {
  channel: ExecutionChannel;
  reason: string;
}

export function route(cap: CapabilityDescriptor, opts: { userAvailable?: boolean } = {}): RouteDecision {
  if (cap.api) return { channel: "api", reason: `structured API available (${cap.api.auth})` };
  if (cap.connector) return { channel: "connector", reason: `approved connector: ${cap.connector.name}` };
  if (cap.domSelector) return { channel: "dom", reason: "DOM/accessibility grounding possible" };
  if (cap.visualHint) return { channel: "visual", reason: "no reliable DOM anchor; visual grounding" };
  if (opts.userAvailable) return { channel: "handoff", reason: "no automatable channel — ask user" };
  return { channel: "handoff", reason: "no channel available; escalate" };
}
