export interface FillTarget {
  /** Android package of the app asking for a login (also set for browsers). */
  packageName: string | null;
  /** Website domain when the request comes from a browser page. */
  webDomain: string | null;
}

export interface Targets {
  domains: string[];
  packages: string[];
}

interface Matchable {
  platform: string;
  website?: string;
}

/** "https://www.Instagram.com/login" -> "instagram.com"; a package name passes through lowercased. */
export function normalizeSite(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#:]/)[0];
}

const isDomainOf = (host: string, domain: string) =>
  host === domain || host.endsWith("." + domain);

/**
 * True when the entry belongs to the site/app asking for a login. Matches on
 * the entry's own `website` (a domain or an app package) and on the built-in
 * domains/packages of its platform. Domains match exact or as a subdomain
 * (login.instagram.com -> instagram.com), never as a lookalike
 * (instagram.com.evil.io does not match).
 */
export function matchesTarget(
  entry: Matchable,
  target: FillTarget,
  platformTargets: Record<string, Targets>,
): boolean {
  const host = target.webDomain ? normalizeSite(target.webDomain) : null;
  const pkg = target.packageName?.toLowerCase() ?? null;

  const known =
    platformTargets[entry.platform] ??
    Object.entries(platformTargets).find(
      ([name]) => name.toLowerCase() === entry.platform.toLowerCase(),
    )?.[1];
  const domains = [...(known?.domains ?? [])];
  const packages = [...(known?.packages ?? [])].map((p) => p.toLowerCase());

  if (entry.website?.trim()) {
    const site = normalizeSite(entry.website);
    domains.push(site);
    packages.push(site); // a package name has no scheme/path, so it survives normalizing
  }

  if (host && domains.some((d) => isDomainOf(host, d))) return true;
  if (pkg && packages.includes(pkg)) return true;
  return false;
}

/** Entries for this target first (stable order), everything else after. */
export function rankForTarget<T extends Matchable>(
  entries: T[],
  target: FillTarget,
  platformTargets: Record<string, Targets>,
): { matches: T[]; others: T[] } {
  const matches: T[] = [];
  const others: T[] = [];
  for (const e of entries) {
    (matchesTarget(e, target, platformTargets) ? matches : others).push(e);
  }
  return { matches, others };
}
