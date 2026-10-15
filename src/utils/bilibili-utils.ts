import sources from "../../config/external-sources.json";
import snapshotJson from "@/data/external-snapshot.json";
import { applyBilibiliOverrides, type ExternalSnapshot, type BilibiliOverride } from "@/data/external-data";

/** The deployed site reads a public build snapshot and never needs Bilibili credentials. */
export function readBilibiliSnapshot() {
  const snapshot = snapshotJson as unknown as ExternalSnapshot;
  const uid = sources.bilibili.uid;
  // Never display someone else's snapshot after the configured UID changes.
  const current = uid && snapshot.bilibili.uid === uid ? snapshot.bilibili : null;
  return {
    uid,
    status: current?.status ?? (uid ? "unavailable" : "unconfigured"),
    lastSuccessAt: current?.lastSuccessAt ?? null,
    items: applyBilibiliOverrides(current?.items ?? [], sources.bilibili.overrides as Record<string, BilibiliOverride>),
  };
}

export const watchingStatusLabels = {
  planned: "想看",
  watching: "在看",
  completed: "看完",
  "on-hold": "搁置",
  dropped: "弃番",
};
