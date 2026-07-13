// Spec §6 — Destination-aware data-loss prevention & recipient verification
export type DataField =
  | "legal_name" | "email" | "phone" | "address"
  | "passport_details" | "ssn" | "payment_token" | "credit_card"
  | "api_key" | "password" | "session_token" | "generic";

export type Destination =
  | { kind: "same_domain"; domain: string }
  | { kind: "known_partner"; domain: string }
  | { kind: "public_web"; domain: string }
  | { kind: "untrusted_page"; domain: string };

export interface DLPDecision {
  action: "allow" | "redact" | "block";
  redactedFields: DataField[];
  reasons: string[];
}

const HIGH_SENS: DataField[] = [
  "ssn", "passport_details", "credit_card", "api_key", "password", "session_token", "payment_token",
];

export function evaluate(
  fields: DataField[],
  destination: Destination,
  opts: { recipientVerified?: boolean } = {},
): DLPDecision {
  const reasons: string[] = [];
  const redacted: DataField[] = [];

  if (destination.kind === "untrusted_page") {
    reasons.push("destination is an untrusted page");
    return { action: "block", redactedFields: [], reasons };
  }

  for (const f of fields) {
    if (HIGH_SENS.includes(f)) {
      if (destination.kind === "public_web") {
        reasons.push(`${f} not allowed on public web`);
        redacted.push(f);
      } else if (destination.kind === "known_partner" && !opts.recipientVerified) {
        reasons.push(`${f} requires recipient verification`);
        return { action: "block", redactedFields: [], reasons };
      }
    }
  }

  if (redacted.length > 0) return { action: "redact", redactedFields: redacted, reasons };
  return { action: "allow", redactedFields: [], reasons: reasons.length ? reasons : ["no sensitive fields at risk"] };
}

// Recipient verifier — checks a proposed email/handle against known contacts.
export function verifyRecipient(
  proposed: string,
  authorizedContacts: string[],
): { verified: boolean; matched?: string; suggestions: string[] } {
  const norm = proposed.trim().toLowerCase();
  const exact = authorizedContacts.find((c) => c.toLowerCase() === norm);
  if (exact) return { verified: true, matched: exact, suggestions: [] };
  const suggestions = authorizedContacts.filter((c) =>
    c.toLowerCase().includes(norm.split("@")[0]?.slice(0, 3) ?? "___"),
  );
  return { verified: false, suggestions };
}
