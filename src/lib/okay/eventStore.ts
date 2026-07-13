// Spec §5 — append-only event-sourced state
import type { OkayEvent } from "./types";

const KEY = "okay:events";

function readAll(): OkayEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OkayEvent[];
  } catch {
    return [];
  }
}

function writeAll(events: OkayEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function append(
  event: Omit<OkayEvent, "event_id" | "timestamp"> &
    Partial<Pick<OkayEvent, "event_id" | "timestamp">>,
): OkayEvent {
  const full: OkayEvent = {
    event_id: event.event_id ?? crypto.randomUUID(),
    timestamp: event.timestamp ?? new Date().toISOString(),
    mission_id: event.mission_id,
    type: event.type,
    payload: event.payload ?? {},
    evidence: event.evidence,
  };
  const all = readAll();
  all.push(full);
  writeAll(all);
  return full;
}

export function list(): OkayEvent[] {
  return readAll();
}

export function replay(missionId: string): OkayEvent[] {
  return readAll().filter((e) => e.mission_id === missionId);
}

export function reduceMission<T>(
  missionId: string,
  init: T,
  fn: (state: T, event: OkayEvent) => T,
): T {
  return replay(missionId).reduce(fn, init);
}

export function clearMission(missionId: string) {
  writeAll(readAll().filter((e) => e.mission_id !== missionId));
}
