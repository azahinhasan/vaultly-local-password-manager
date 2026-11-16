import { CATEGORIES, OTHER_CATEGORY, type PlatformEntry } from "../constants/platforms.ts";

interface Searchable {
  platform: string;
  username?: string;
  email?: string;
  website?: string;
  phone?: string;
}

export function categoryOf(
  platformName: string,
  platforms: PlatformEntry[],
): string {
  return platforms.find((p) => p.name === platformName)?.category ?? OTHER_CATEGORY;
}

/** Live search over platform / username / email, plus an optional category chip. */
export function filterEntries<T extends Searchable>(
  entries: T[],
  query: string,
  category: string | null,
  platforms: PlatformEntry[],
): T[] {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!category || categoryOf(e.platform, platforms) === category) &&
      (!q ||
        e.platform.toLowerCase().includes(q) ||
        (e.username ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (e.website ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q)),
  );
}

/** Categories present in the data, in display order. */
export function usedCategories<T extends Searchable>(
  entries: T[],
  platforms: PlatformEntry[],
): string[] {
  const used = new Set(entries.map((e) => categoryOf(e.platform, platforms)));
  const rank = (c: string) => {
    const i = CATEGORIES.indexOf(c);
    return i === -1 ? CATEGORIES.length : i;
  };
  return [...used].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Most recently used platforms, newest first. */
export function recentPlatforms(
  platforms: PlatformEntry[],
  limit = 5,
): PlatformEntry[] {
  return platforms
    .filter((p) => p.lastUsedAt)
    .sort((a, b) => b.lastUsedAt! - a.lastUsedAt!)
    .slice(0, limit);
}

/** Platforms grouped by category, in display order, each group sorted by name. */
export function groupByCategory(platforms: PlatformEntry[]) {
  const groups = new Map<string, PlatformEntry[]>();
  for (const p of platforms) {
    groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
  }
  return usedCategories(
    platforms.map((p) => ({ platform: p.name })),
    platforms,
  ).map((title) => ({
    title,
    data: (groups.get(title) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
