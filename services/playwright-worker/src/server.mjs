import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { chromium } from "playwright";
import { assertNavigationUrl, parseAction } from "./protocol.mjs";

const port = Number(process.env.PORT ?? 8787);
const token = process.env.OKAY_WORKER_TOKEN ?? "";
const headless = process.env.HEADLESS !== "false";
const allowPrivateNetwork = process.env.OKAY_ALLOW_PRIVATE_NETWORK === "true";
const contexts = new Map();
let browser;

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!token) return process.env.NODE_ENV !== "production";
  const supplied = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function ensureBrowser() {
  if (!browser?.isConnected()) {
    browser = await chromium.launch({ headless });
    browser.on("disconnected", () => {
      contexts.clear();
      browser = undefined;
    });
  }
  return browser;
}

function ownerFrom(req) {
  const owner = req.headers["x-okay-owner"];
  if (typeof owner !== "string" || !/^[0-9a-f-]{36}$/i.test(owner)) {
    const error = new Error("owner_required");
    error.status = 401;
    throw error;
  }
  return owner;
}

function record(id, owner) {
  const found = contexts.get(id);
  if (!found) {
    const error = new Error("context_not_found");
    error.status = 404;
    throw error;
  }
  if (found.owner !== owner) {
    const error = new Error("context_forbidden");
    error.status = 403;
    throw error;
  }
  return found;
}

async function snapshot(rec) {
  const page = rec.page;
  rec.version += 1;
  rec.elements.clear();
  const fingerprintCounts = new Map();

  const frames = page.frames().map((frame, index) => ({
    id: index === 0 ? "main" : `f${index}`,
    url: frame.url(),
  }));
  const elements = [];

  for (const [frameIndex, frame] of page.frames().entries()) {
    const candidates = frame.locator(
      'button, a[href], input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="tab"], [role="switch"], [role="slider"], h1, h2, h3'
    );
    const count = Math.min(await candidates.count(), 500);

    for (let index = 0; index < count; index += 1) {
      const locator = candidates.nth(index);
      const data = await locator.evaluate((element) => {
        const html = element;
        const rect = html.getBoundingClientRect();
        const style = getComputedStyle(html);
        const tag = html.tagName.toLowerCase();
        const implicit = {
          a: "link", button: "button", input: "textbox", select: "combobox",
          textarea: "textbox", h1: "heading", h2: "heading", h3: "heading",
        };
        const labelledBy = html.getAttribute("aria-labelledby");
        const labelled = labelledBy
          ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ")
          : "";
        const label = html.id
          ? document.querySelector(`label[for="${CSS.escape(html.id)}"]`)?.textContent ?? ""
          : "";
        return {
          role: html.getAttribute("role") ?? implicit[tag] ?? tag,
          name: (html.getAttribute("aria-label") ?? labelled ?? label ?? html.textContent ?? "").trim().slice(0, 200),
          value: "value" in html ? String(html.value ?? "") : undefined,
          visible: style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0,
          enabled: !("disabled" in html && html.disabled),
          bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          domId: html.id || undefined,
          tag,
        };
      }).catch(() => null);

      if (!data || (!data.visible && data.role !== "heading")) continue;
      const baseFingerprint = [
        frame.url(), data.tag, data.role, data.name, data.domId ?? "",
      ].join("\\u001f");
      const occurrence = fingerprintCounts.get(baseFingerprint) ?? 0;
      fingerprintCounts.set(baseFingerprint, occurrence + 1);
      const fingerprint = `${baseFingerprint}\\u001f${occurrence}`;
      let id = rec.handleIds.get(fingerprint);
      if (!id) {
        id = randomUUID();
        rec.handleIds.set(fingerprint, id);
      }
      rec.elements.set(id, { locator, frameIndex, version: rec.version, fingerprint });
      const { domId: _domId, tag: _tag, ...semantic } = data;
      elements.push({ id, ...semantic, frameId: frameIndex === 0 ? undefined : `f${frameIndex}` });
    }
  }

  const captcha = await page.locator(
    '.g-recaptcha, .h-captcha, [class*="turnstile"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare"]'
  ).first().isVisible().catch(() => false);

  const modalLocator = page.locator('[role="dialog"][aria-modal="true"]').first();
  const modalVisible = await modalLocator.isVisible().catch(() => false);

  if (rec.handleIds.size > 5_000) {
    const active = new Set([...rec.elements.values()].map((element) => element.fingerprint));
    for (const fingerprint of rec.handleIds.keys()) {
      if (!active.has(fingerprint)) rec.handleIds.delete(fingerprint);
      if (rec.handleIds.size <= 4_000) break;
    }
  }

  return {
    page: { url: page.url(), title: await page.title(), state_version: rec.version },
    elements,
    frames,
    ...(captcha ? { captcha: { provider: "challenge" } } : {}),
    ...(modalVisible ? {
      modal: {
        role: "dialog",
        name: (await modalLocator.getAttribute("aria-label")) ?? (await modalLocator.textContent())?.trim().slice(0, 200) ?? "",
      },
    } : {}),
  };
}

async function act(rec, action) {
  if (action.state_version !== rec.version) {
    return { ok: false, error: "stale_state_version", newSnapshot: await snapshot(rec) };
  }

  if (action.kind === "navigate") {
    await rec.page.goto(assertNavigationUrl(action.url, { allowPrivateNetwork }), { waitUntil: "domcontentloaded", timeout: 30_000 });
  } else if (action.kind === "wait") {
    await rec.page.waitForTimeout(Math.min(Number(action.timeout_ms ?? 250), 5_000));
  } else if (action.kind === "screenshot") {
    await rec.page.screenshot({ path: undefined, fullPage: false });
  } else {
    const target = rec.elements.get(action.element_id);
    if (!target || target.version !== rec.version) {
      return { ok: false, error: "element_not_found", newSnapshot: await snapshot(rec) };
    }
    await target.locator.waitFor({ state: "visible", timeout: 10_000 });
    if (action.kind === "click") await target.locator.click({ timeout: 10_000 });
    else if (action.kind === "type") await target.locator.fill(String(action.text ?? ""));
    else if (action.kind === "select") await target.locator.selectOption(String(action.text ?? ""));
    else throw new Error("unsupported_action");
  }

  await rec.page.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
  return { ok: true, newSnapshot: await snapshot(rec) };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, browserConnected: Boolean(browser?.isConnected()), contexts: contexts.size });
    }
    if (!authorized(req)) return json(res, 401, { error: "unauthorized" });

    if (req.method === "POST" && url.pathname === "/v1/contexts") {
      const owner = ownerFrom(req);
      const input = await body(req);
      const instance = await ensureBrowser();
      const context = await instance.newContext({ acceptDownloads: true });
      const page = await context.newPage();
      const id = randomUUID();
      const rec = { id, owner, trustDomain: String(input.trustDomain ?? "research"), context, page, version: 0, elements: new Map(), handleIds: new Map() };
      contexts.set(id, rec);
      return json(res, 201, { context: { id, trustDomain: rec.trustDomain }, snapshot: await snapshot(rec) });
    }

    const match = url.pathname.match(/^\/v1\/contexts\/([^/]+)(?:\/(navigate|snapshot|actions))?$/);
    if (!match) return json(res, 404, { error: "not_found" });
    const rec = record(match[1], ownerFrom(req));
    const operation = match[2];

    if (req.method === "GET" && operation === "snapshot") return json(res, 200, await snapshot(rec));
    if (req.method === "POST" && operation === "navigate") {
      const input = await body(req);
      await rec.page.goto(assertNavigationUrl(String(input.url), { allowPrivateNetwork }), { waitUntil: "domcontentloaded", timeout: 30_000 });
      return json(res, 200, await snapshot(rec));
    }
    if (req.method === "POST" && operation === "actions") return json(res, 200, await act(rec, parseAction(await body(req))));
    if (req.method === "DELETE" && !operation) {
      await rec.context.close();
      contexts.delete(rec.id);
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    const status = Number(error.status ?? (error.message === "request_too_large" ? 413 : 500));
    json(res, status, { error: error.message ?? "unknown_error" });
  }
});

server.listen(port, () => console.log(`Okay Playwright worker listening on :${port}`));

async function shutdown() {
  server.close();
  for (const rec of contexts.values()) await rec.context.close().catch(() => {});
  contexts.clear();
  await browser?.close().catch(() => {});
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
