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

// Built-in sites/apps per platform, used by autofill. Best effort: apps can
// change package names, and users can add their own via an entry's
// "Website or app" field.
export const PLATFORM_TARGETS: Record<
  string,
  { domains: string[]; packages: string[] }
> = {
  Facebook: { domains: ["facebook.com", "messenger.com", "fb.com"], packages: ["com.facebook.katana", "com.facebook.orca", "com.facebook.lite"] },
  Instagram: { domains: ["instagram.com"], packages: ["com.instagram.android"] },
  X: { domains: ["x.com", "twitter.com"], packages: ["com.twitter.android"] },
  TikTok: { domains: ["tiktok.com"], packages: ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill"] },
  Snapchat: { domains: ["snapchat.com"], packages: ["com.snapchat.android"] },
  LinkedIn: { domains: ["linkedin.com"], packages: ["com.linkedin.android"] },
  Reddit: { domains: ["reddit.com"], packages: ["com.reddit.frontpage"] },
  Pinterest: { domains: ["pinterest.com"], packages: ["com.pinterest"] },
  Google: { domains: ["google.com", "gmail.com"], packages: ["com.google.android.gm", "com.google.android.apps.docs"] },
  GitHub: { domains: ["github.com"], packages: ["com.github.android"] },
  Microsoft: { domains: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com"], packages: ["com.microsoft.office.outlook"] },
  Slack: { domains: ["slack.com"], packages: ["com.Slack"] },
  Notion: { domains: ["notion.so"], packages: ["notion.id"] },
  Zoom: { domains: ["zoom.us"], packages: ["us.zoom.videomeetings"] },
  Dropbox: { domains: ["dropbox.com"], packages: ["com.dropbox.android"] },
  PayPal: { domains: ["paypal.com"], packages: ["com.paypal.android.p2pmobile"] },
  Wise: { domains: ["wise.com"], packages: ["com.transferwise.android"] },
  Binance: { domains: ["binance.com"], packages: ["com.binance.dev"] },
  Stripe: { domains: ["stripe.com"], packages: ["com.stripe.android.dashboard"] },
  Netflix: { domains: ["netflix.com"], packages: ["com.netflix.mediaclient"] },
  Spotify: { domains: ["spotify.com"], packages: ["com.spotify.music"] },
  YouTube: { domains: ["youtube.com"], packages: ["com.google.android.youtube"] },
  Steam: { domains: ["steampowered.com", "steamcommunity.com"], packages: ["com.valvesoftware.android.steam.community"] },
  Amazon: { domains: ["amazon.com"], packages: ["com.amazon.mShop.android.shopping"] },
  eBay: { domains: ["ebay.com"], packages: ["com.ebay.mobile"] },
  Alibaba: { domains: ["alibaba.com", "aliexpress.com"], packages: ["com.alibaba.aliexpresshd"] },
};
