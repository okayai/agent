// Spec §1 — Interaction gateway: directives, attachments, approvals, corrections
import type { OkayEvent } from "./types";
import { append } from "./eventStore";

export type ApprovalDecision = "approve" | "reject" | "modify";

export interface Attachment {
  name: string;
  mime: string;
  bytes: number;
  hash: string;
  origin: "user_upload" | "system";
}

export interface Directive {
  mission_id: string;
  text: string;
  attachments: Attachment[];
  submittedAt: string;
}

export interface Approval {
  mission_id: string;
  action_id: string;
  decision: ApprovalDecision;
  notes?: string;
  at: string;
}

export interface Correction {
  mission_id: string;
  target: string;
  before: unknown;
  after: unknown;
  scope: "mission" | "candidate_preference";
  at: string;
}

export function submitDirective(
  d: Omit<Directive, "submittedAt">,
): { directive: Directive; event: OkayEvent } {
  const directive: Directive = { ...d, submittedAt: new Date().toISOString() };
  const event = append({
    mission_id: d.mission_id,
    type: "gateway:directive",
    payload: directive as unknown as Record<string, unknown>,
  });
  return { directive, event };
}

export function submitApproval(a: Omit<Approval, "at">): OkayEvent {
  const approval: Approval = { ...a, at: new Date().toISOString() };
  return append({
    mission_id: a.mission_id,
    type: "gateway:approval",
    payload: approval as unknown as Record<string, unknown>,
  });
}

export function submitCorrection(c: Omit<Correction, "at">): OkayEvent {
  const correction: Correction = { ...c, at: new Date().toISOString() };
  return append({
    mission_id: c.mission_id,
    type: "gateway:correction",
    payload: correction as unknown as Record<string, unknown>,
  });
}
