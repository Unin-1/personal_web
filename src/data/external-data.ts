export type SyncStatus = "fresh" | "stale" | "unavailable" | "unconfigured";
export type ProjectStatus = "" | "in-progress" | "completed" | "interrupted";
export type WatchingStatus = "planned" | "watching" | "completed" | "on-hold" | "dropped";

export interface RepositorySnapshot {
  repo: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  status: SyncStatus;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
}

export interface AnimeSnapshotItem {
  id: number;
  title: string;
  originalTitle: string;
  poster: string | null;
  type: "tv" | "movie";
  season_type: number;
  rating: number;
  date: string;
  overview: string;
  link: string;
  epStatus: string;
}

export interface BilibiliOverride {
  watchedEpisodes?: number;
  status?: WatchingStatus;
}

export interface ExternalSnapshot {
  schemaVersion: number;
  github: { repositories: Record<string, RepositorySnapshot> };
  bilibili: {
    uid: string;
    items: AnimeSnapshotItem[];
    status: SyncStatus;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
  };
}

/** Hand-written values win. Sync data never controls a project's manual status. */
export function mergeProjectMetadata<T extends {
  title: string;
  description: string;
  repo: string;
  language: string;
  stars?: number;
  link: { label: string; icon: string; value: string }[];
}>(project: T, snapshot?: RepositorySnapshot) {
  const synced = snapshot?.lastSuccessAt ? snapshot : undefined;
  return {
    ...project,
    title: project.title || synced?.name || project.repo,
    description: project.description || synced?.description || "",
    language: project.language || synced?.language || "",
    stars: project.stars ?? synced?.stars,
    link: project.link.length ? project.link : project.repo ? [{
      label: "GitHub",
      icon: "fa7-brands:github",
      value: `https://github.com/${project.repo}`,
    }] : [],
    syncStatus: snapshot?.status,
    lastSuccessAt: snapshot?.lastSuccessAt,
  };
}

/** Personal progress is explicit local data, never inferred from the latest release. */
export function applyBilibiliOverrides(
  items: AnimeSnapshotItem[],
  overrides: Record<string, BilibiliOverride>,
) {
  return items.map((item) => ({ ...item, ...overrides[String(item.id)] }));
}
