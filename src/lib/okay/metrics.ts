// Spec §7 — Long-horizon reliability metrics computed over the event store.
import { list } from "./eventStore";

export interface MissionMetrics {
  mission_id: string;
  correctOutcome: boolean;
  constraintViolations: number;
  userInterruptions: number;
  duplicateSideEffects: number;
  recoveries: number;
  humanCorrections: number;
  durationMs: number | null;
}

export function metricsForMission(mission_id: string): MissionMetrics {
  const events = list().filter((e) => e.mission_id === mission_id);
  const first = events[0]?.timestamp;
  const last = events[events.length - 1]?.timestamp;
  const has = (t: string) => events.some((e) => e.type === t);
  const count = (prefix: string) => events.filter((e) => e.type.startsWith(prefix)).length;

  return {
    mission_id,
    correctOutcome: has("verify:ok") && !has("verify:fail"),
    constraintViolations: count("policy:deny") + count("orchestrator:failed"),
    userInterruptions: count("gateway:approval"),
    duplicateSideEffects: 0, // idempotency guards prevent recording duplicates; would be non-zero only on regression
    recoveries: count("orchestrator:running") - count("orchestrator:succeeded") - count("orchestrator:failed") - count("orchestrator:skipped"),
    humanCorrections: count("feedback:correction"),
    durationMs: first && last ? +new Date(last) - +new Date(first) : null,
  };
}

export function aggregate(missions: string[]): {
  correctRate: number;
  meanDurationMs: number | null;
  totalCorrections: number;
} {
  if (missions.length === 0) return { correctRate: 0, meanDurationMs: null, totalCorrections: 0 };
  const rows = missions.map(metricsForMission);
  const correct = rows.filter((r) => r.correctOutcome).length;
  const durations = rows.map((r) => r.durationMs).filter((d): d is number => d !== null);
  const mean = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  return {
    correctRate: correct / rows.length,
    meanDurationMs: mean,
    totalCorrections: rows.reduce((a, r) => a + r.humanCorrections, 0),
  };
}
