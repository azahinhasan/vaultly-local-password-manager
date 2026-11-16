export interface PlatformEntry {
  name: string;
  /** Set only for platforms whose color the user picked; otherwise the
   * monogram color is derived from the name. */
  color?: string;
  category: string;
  /** Epoch ms of the last entry saved with this platform. */
  lastUsedAt?: number;
}

export const OTHER_CATEGORY = "Other";

// Display order of category groups; unknown categories sort after these.
export const CATEGORIES = [
  "Social",
  "Work",
  "Finance",
  "Entertainment",
  "Shopping",
  OTHER_CATEGORY,
];

const group = (category: string, names: string[]): PlatformEntry[] =>
  names.map((name) => ({ name, category }));

// Seed data — the starting set of managed platforms on first launch.
// Data, not UI: extend by adding names here.
export const DEFAULT_PLATFORMS: PlatformEntry[] = [
  ...group("Social", [
    "Facebook", "Instagram", "X", "TikTok", "Snapchat", "LinkedIn", "Reddit", "Pinterest",
  ]),
  ...group("Work", [
    "Google", "GitHub", "Microsoft", "Slack", "Notion", "Zoom", "Dropbox",
  ]),
  ...group("Finance", ["Bank", "PayPal", "Wise", "Binance", "Stripe"]),
  ...group("Entertainment", ["Netflix", "Spotify", "YouTube", "Steam"]),
  ...group("Shopping", ["Amazon", "eBay", "Alibaba"]),
];

export const MAX_PLATFORM_NAME_LENGTH = 16;

// Selectable palette for platforms whose color the user picks in Manage Platforms.
export const COLOR_PALETTE = [
  "#4285F4", // blue
  "#6366F1", // indigo
  "#16A34A", // green
  "#F97316", // orange
  "#EF4444", // red
  "#EC4899", // pink
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#14B8A6", // teal
  "#6B7280", // gray
];

/** Pastel monogram color from a hash of the name: hsl(h, 85%, 78%). */
export function monogramColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 85%, 78%)`;
}
