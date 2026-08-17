// Fixed set of platform choices for the Add/Edit Entry form.
// Extend this list as more platforms are supported.
export const PLATFORMS = [
  "Google",
  "Facebook",
  "Microsoft",
  "Ubisoft",
  "Steam",
  "EA",
  "Sony",
];

// Color tag for each fixed platform, shown as a dot on vault list cards.
export const PLATFORM_COLORS: Record<string, string> = {
  Google: "#4285F4",
  Facebook: "#6366F1",
  Microsoft: "#16A34A",
  Ubisoft: "#F97316",
  Steam: "#6e7a95",
  EA: "#b87700",
  Sony: "#003791",
};

// Fallback color for entries with no assigned color (custom platforms
// that didn't pick one).
export const DEFAULT_PLATFORM_COLOR = "#9CA3AF";

// Selectable palette for custom (manually-entered) platforms.
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

/** The color dot to show for an entry: fixed platforms always use their
 * assigned color; custom platforms use their chosen color, or the default. */
export function getPlatformColor(
  platform: string,
  customColor?: string,
): string {
  const fixedColor = PLATFORM_COLORS[platform];
  if (fixedColor) {
    return fixedColor;
  }
  return customColor ?? DEFAULT_PLATFORM_COLOR;
}
