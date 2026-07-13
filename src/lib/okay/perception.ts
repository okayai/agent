// Spec §2 — Perception engine
// Layer 1 (DOM & accessibility semantics) is implemented directly here.
// Layer 2 (visual) and Layer 3 (LLM grounding) are exposed as typed adapters.

export interface SemanticElement {
  id: string;
  role: string;
  name: string;
  value?: string;
  visible: boolean;
  enabled: boolean;
  inShadow?: boolean;
  frameId?: string;
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface PageSnapshot {
  page: { url: string; title: string; state_version: number };
  elements: SemanticElement[];
  modal?: { role: string; name: string };
  captcha?: { provider: string };
  frames: { id: string; url: string }[];
}

let _stateVersion = 0;
export function bumpStateVersion() { _stateVersion++; return _stateVersion; }
export function getStateVersion() { return _stateVersion; }

function isVisible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return false;
  const style = getComputedStyle(el as HTMLElement);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return r.width > 0 && r.height > 0;
}

function accName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const l = document.getElementById(labelledby);
    if (l) return l.textContent?.trim() ?? "";
  }
  if (el.tagName === "INPUT") {
    const id = el.getAttribute("id");
    if (id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lbl) return lbl.textContent?.trim() ?? "";
    }
  }
  return (el.textContent ?? "").trim().slice(0, 120);
}

function role(el: Element): string {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  const map: Record<string, string> = {
    button: "button", a: "link", input: "textbox", select: "combobox",
    textarea: "textbox", nav: "navigation", main: "main", form: "form",
    dialog: "dialog", h1: "heading", h2: "heading", h3: "heading",
  };
  return map[tag] ?? tag;
}

const INTERACTIVE = new Set([
  "button", "link", "textbox", "combobox", "checkbox", "radio", "menuitem", "tab", "switch", "slider",
]);

export function snapshotPage(root: ParentNode = document): PageSnapshot {
  const elements: SemanticElement[] = [];
  const frames: { id: string; url: string }[] = [];
  let modal: PageSnapshot["modal"];
  let captcha: PageSnapshot["captcha"];

  function walk(node: ParentNode, inShadow: boolean, frameId?: string) {
    const els = node.querySelectorAll("*");
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const r = role(el);
      const n = accName(el);
      const visible = isVisible(el);
      const enabled = !(el as HTMLInputElement).disabled;

      if (r === "dialog" && el.getAttribute("aria-modal") === "true" && visible) {
        modal = { role: r, name: n };
      }
      if (/g-recaptcha|hcaptcha|turnstile/i.test((el as HTMLElement).className ?? "")) {
        captcha = { provider: (el as HTMLElement).className.match(/g-recaptcha|hcaptcha|turnstile/i)?.[0] ?? "unknown" };
      }

      if (INTERACTIVE.has(r) || (visible && n && r === "heading")) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        elements.push({
          id: `e${elements.length + 1}`,
          role: r,
          name: n,
          value: (el as HTMLInputElement).value ?? undefined,
          visible, enabled, inShadow, frameId,
          bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        });
      }

      // Shadow DOM traversal
      const sr = (el as HTMLElement).shadowRoot;
      if (sr) walk(sr, true, frameId);
    }
  }

  walk(root, false);

  // Iframe frame-tree binding (same-origin only)
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((f, i) => {
    const id = `f${i + 1}`;
    frames.push({ id, url: f.src });
    try {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (doc) walk(doc, false, id);
    } catch {
      // cross-origin — skip
    }
  });

  return {
    page: {
      url: location.href,
      title: document.title,
      state_version: _stateVersion,
    },
    elements, modal, captcha, frames,
  };
}

// Layer 3 grounding adapter — resolves a semantic query to a candidate element.
export interface GroundingCandidate {
  element_id: string;
  score: number;
  reason: string;
}
export interface GroundingAdapter {
  select(query: string, snapshot: PageSnapshot): Promise<GroundingCandidate[]>;
}

// Simple deterministic grounder: fuzzy match by role + accessible name.
export const LocalGrounder: GroundingAdapter = {
  async select(query, snapshot) {
    const q = query.toLowerCase();
    return snapshot.elements
      .filter((e) => e.visible && e.enabled)
      .map((e) => {
        const nameHit = e.name.toLowerCase().includes(q) ? 0.7 : 0;
        const roleHit = q.includes(e.role) ? 0.3 : 0;
        return { element_id: e.id, score: nameHit + roleHit, reason: `${e.role}:"${e.name}"` };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  },
};

// Layer 2 visual adapter — interface only; concrete impl requires a vision model host.
export interface VisualAdapter {
  screenshotRegion(bbox: { x: number; y: number; w: number; h: number }): Promise<Blob>;
  describe(region: Blob): Promise<string>;
}
