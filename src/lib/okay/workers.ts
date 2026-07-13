// Spec §1 — Capability workers: email / calendar / documents / calculations.
// These call edge functions that use the LLM to draft artifacts. Drafts only —
// no external send. Compensation for email = delete draft. Calendar hold cancels.

import { supabase } from "@/integrations/supabase/client";

export interface EmailDraft {
  id: string;
  to: string[];
  subject: string;
  body: string;
  createdAt: string;
}
export interface CalendarDraft {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  timezone: string;
  createdAt: string;
}
export interface DocDraft {
  id: string;
  title: string;
  markdown: string;
  createdAt: string;
}

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message);
  return data as T;
}

export const email = {
  async draft(input: { to: string[]; intent: string; context?: string }): Promise<EmailDraft> {
    return invoke<EmailDraft>("okay-draft-email", input);
  },
};

export const calendar = {
  async draft(input: { title: string; when: string; attendees: string[]; timezone: string }): Promise<CalendarDraft> {
    return invoke<CalendarDraft>("okay-draft-calendar", input);
  },
};

export const docs = {
  async draft(input: { title: string; outline: string[]; audience?: string }): Promise<DocDraft> {
    return invoke<DocDraft>("okay-draft-doc", input);
  },
};

// Deterministic calculations capability — no LLM needed, no external effect.
export const calc = {
  add: (a: number, b: number) => a + b,
  sum: (xs: number[]) => xs.reduce((a, b) => a + b, 0),
  pct: (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100),
};
