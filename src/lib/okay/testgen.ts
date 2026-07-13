// Spec §7 — Deterministic test candidate generator.
// Reads an event trace and emits vitest-shaped test candidates that assert
// invariants held during that mission. Candidates enter the promotion pipeline.
import { replay } from "./eventStore";
import { create as createPromotion } from "./promotion";

export interface TestCandidate {
  id: string;
  name: string;
  source_mission: string;
  vitestSource: string;
  invariant: string;
}

export function generateFromMission(mission_id: string): TestCandidate[] {
  const events = replay(mission_id);
  const out: TestCandidate[] = [];

  // Invariant 1: no verify:fail followed by verify:ok on same criterion in same node
  const failThenOk = new Set<string>();
  const seenFail = new Map<string, string>();
  for (const e of events) {
    if (e.type === "verify:fail") seenFail.set(String(e.payload.criterion ?? ""), String(e.payload.node_id ?? ""));
    if (e.type === "verify:ok") {
      const c = String(e.payload.criterion ?? "");
      if (seenFail.has(c)) failThenOk.add(c);
    }
  }
  if (failThenOk.size === 0 && events.some((e) => e.type === "verify:ok")) {
    out.push({
      id: crypto.randomUUID(),
      name: `mission-${mission_id}-first-try-success`,
      source_mission: mission_id,
      invariant: "every verify:ok criterion succeeded on the first attempt",
      vitestSource:
        `import { describe, it, expect } from "vitest";\n` +
        `import { replay } from "@/lib/okay/eventStore";\n` +
        `describe("mission ${mission_id} success invariant", () => {\n` +
        `  it("no criterion failed before it succeeded", () => {\n` +
        `    const events = replay(${JSON.stringify(mission_id)});\n` +
        `    const failed = new Set(events.filter(e => e.type === "verify:fail").map(e => e.payload.criterion));\n` +
        `    const okd = events.filter(e => e.type === "verify:ok").map(e => e.payload.criterion);\n` +
        `    for (const c of okd) expect(failed.has(c)).toBe(false);\n` +
        `  });\n});`,
    });
  }

  // Invariant 2: no orchestrator:succeeded without a matching orchestrator:running
  const running = new Set(events.filter((e) => e.type === "orchestrator:running").map((e) => e.payload.node_id));
  const succeeded = events.filter((e) => e.type === "orchestrator:succeeded").map((e) => e.payload.node_id);
  if (succeeded.every((n) => running.has(n)) && succeeded.length > 0) {
    out.push({
      id: crypto.randomUUID(),
      name: `mission-${mission_id}-orchestrator-lifecycle`,
      source_mission: mission_id,
      invariant: "every succeeded node was previously running (no ghost successes)",
      vitestSource:
        `import { describe, it, expect } from "vitest";\n` +
        `import { replay } from "@/lib/okay/eventStore";\n` +
        `describe("mission ${mission_id} orchestrator invariant", () => {\n` +
        `  it("every succeeded node was previously running", () => {\n` +
        `    const events = replay(${JSON.stringify(mission_id)});\n` +
        `    const running = new Set(events.filter(e => e.type === "orchestrator:running").map(e => e.payload.node_id));\n` +
        `    for (const e of events.filter(e => e.type === "orchestrator:succeeded")) expect(running.has(e.payload.node_id)).toBe(true);\n` +
        `  });\n});`,
    });
  }

  // Each candidate enters the promotion pipeline at stage=candidate.
  for (const c of out) createPromotion(c.name);
  return out;
}
