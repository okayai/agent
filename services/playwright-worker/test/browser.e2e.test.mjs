import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

const token = "integration-token";
const fixturePort = 18741;
const workerPort = 18742;

function fixture() {
  return http.createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html>
      <html><head><title>Okay Worker Fixture</title></head>
      <body>
        <label for="name">Passenger name</label>
        <input id="name" />
        <label for="cabin">Cabin</label>
        <select id="cabin"><option>Economy</option><option>Business</option></select>
        <button id="continue" onclick="document.querySelector('#result').textContent='Ready'">Continue</button>
        <p id="result" aria-live="polite"></p>
      </body></html>`);
  });
}

async function request(path, init = {}) {
  const response = await fetch(`http://127.0.0.1:${workerPort}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const payload = await response.json();
  assert.equal(response.ok, true, JSON.stringify(payload));
  return payload;
}

async function waitForWorker(child) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`worker_exited_${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${workerPort}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("worker_start_timeout");
}

test("real Chromium context navigates, perceives, acts, and rejects stale state", { timeout: 30_000 }, async (t) => {
  const site = fixture();
  site.listen(fixturePort, "127.0.0.1");
  await once(site, "listening");

  const child = spawn(process.execPath, ["src/server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(workerPort),
      NODE_ENV: "test",
      HEADLESS: "true",
      OKAY_WORKER_TOKEN: token,
      OKAY_ALLOW_PRIVATE_NETWORK: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  t.after(async () => {
    child.kill("SIGTERM");
    if (child.exitCode === null) await Promise.race([once(child, "exit"), new Promise((r) => setTimeout(r, 3_000))]);
    await new Promise((resolve) => site.close(resolve));
  });

  await waitForWorker(child);

  const created = await request("/v1/contexts", {
    method: "POST",
    body: JSON.stringify({ trustDomain: "research" }),
  });
  const contextId = created.context.id;

  const first = await request(`/v1/contexts/${contextId}/navigate`, {
    method: "POST",
    body: JSON.stringify({ url: `http://127.0.0.1:${fixturePort}` }),
  });
  assert.equal(first.page.title, "Okay Worker Fixture");

  const input = first.elements.find((element) => element.name === "Passenger name");
  assert.ok(input, "labelled input should be perceived");

  const stale = await request(`/v1/contexts/${contextId}/actions`, {
    method: "POST",
    body: JSON.stringify({ kind: "type", element_id: input.id, text: "Casey", state_version: first.page.state_version - 1 }),
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error, "stale_state_version");

  const refreshedInput = stale.newSnapshot.elements.find((element) => element.name === "Passenger name");
  const typed = await request(`/v1/contexts/${contextId}/actions`, {
    method: "POST",
    body: JSON.stringify({
      kind: "type",
      element_id: refreshedInput.id,
      text: "Casey",
      state_version: stale.newSnapshot.page.state_version,
    }),
  });
  assert.equal(typed.ok, true);
  const typedInput = typed.newSnapshot.elements.find((element) => element.name === "Passenger name");
  assert.equal(typedInput?.value, "Casey");
  assert.equal(typedInput?.id, refreshedInput.id, "semantic handle should remain stable across snapshots");

  await request(`/v1/contexts/${contextId}`, { method: "DELETE" });
});
