import test from "node:test";
import assert from "node:assert/strict";
import { assertNavigationUrl, isPrivateHostname, parseAction } from "../src/protocol.mjs";

test("accepts a bounded versioned click", () => {
  assert.deepEqual(parseAction({ kind: "click", element_id: "e1", state_version: 4 }), {
    kind: "click", element_id: "e1", state_version: 4,
  });
});

test("rejects unversioned actions", () => {
  assert.throws(() => parseAction({ kind: "click", element_id: "e1" }), /invalid_state_version/);
});

test("caps wait duration", () => {
  assert.equal(parseAction({ kind: "wait", timeout_ms: 90_000, state_version: 1 }).timeout_ms, 5_000);
});

test("blocks local and private navigation targets", () => {
  for (const host of ["localhost", "127.0.0.1", "10.0.0.2", "172.16.0.2", "192.168.1.1", "169.254.169.254", "::1"]) {
    assert.equal(isPrivateHostname(host), true, host);
  }
  assert.throws(() => assertNavigationUrl("http://169.254.169.254/latest/meta-data"), /private_network_blocked/);
});

test("allows normal HTTPS destinations and strips embedded credentials", () => {
  assert.equal(assertNavigationUrl("https://user:pass@example.com/a"), "https://example.com/a");
});

test("private targets require an explicit development override", () => {
  assert.equal(
    assertNavigationUrl("http://localhost:4173", { allowPrivateNetwork: true }),
    "http://localhost:4173/",
  );
});
