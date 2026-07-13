const ACTIONS = new Set(["click", "type", "select", "navigate", "wait", "screenshot", "download"]);

export function parseAction(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw bad("invalid_action");
  if (!ACTIONS.has(input.kind)) throw bad("unsupported_action");
  if (!Number.isSafeInteger(input.state_version) || input.state_version < 0) throw bad("invalid_state_version");

  const action = { kind: input.kind, state_version: input.state_version };

  if (["click", "type", "select", "download"].includes(input.kind)) {
    if (typeof input.element_id !== "string" || input.element_id.length < 1 || input.element_id.length > 200) {
      throw bad("invalid_element_id");
    }
    action.element_id = input.element_id;
  }

  if (["type", "select"].includes(input.kind)) {
    if (typeof input.text !== "string" || input.text.length > 100_000) throw bad("invalid_text");
    action.text = input.text;
  }

  if (input.kind === "navigate") {
    if (typeof input.url !== "string" || input.url.length > 8_192) throw bad("invalid_url");
    action.url = input.url;
  }

  if (input.kind === "wait") {
    const timeout = input.timeout_ms ?? 250;
    if (!Number.isFinite(timeout) || timeout < 0) throw bad("invalid_timeout");
    action.timeout_ms = Math.min(Math.floor(timeout), 5_000);
  }

  return action;
}

export function assertNavigationUrl(raw, { allowPrivateNetwork = false } = {}) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw bad("invalid_url");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw bad("unsupported_url_protocol");

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!allowPrivateNetwork && isPrivateHostname(hostname)) throw bad("private_network_blocked", 403);
  url.username = "";
  url.password = "";
  return url.toString();
}

export function isPrivateHostname(hostname) {
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "::1" || hostname === "0.0.0.0") return true;
  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match172 = hostname.match(/^172\.(\d+)\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^fc/i.test(hostname) || /^fd/i.test(hostname) || /^fe[89ab]/i.test(hostname)) return true;
  return false;
}

function bad(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}
