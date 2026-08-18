export interface PlatformEntry {
  name: string;
  color: string;
}

// Seed data — the starting set of managed platforms on first launch.
// Users can add, rename, recolor, or remove any of these from Settings.
export const DEFAULT_PLATFORMS: PlatformEntry[] = [
  { name: "Google", color: "#4285F4" },
  { name: "Facebook", color: "#6366F1" },
  { name: "Microsoft", color: "#16A34A" },
  { name: "Ubisoft", color: "#F97316" },
  { name: "Steam", color: "#6e7a95" },
  { name: "EA", color: "#b87700" },
  { name: "Sony", color: "#003791" },
];

export const MAX_PLATFORM_NAME_LENGTH = 16;

// Fallback color for entries with no assigned color (custom platforms
// that didn't pick one).
export const DEFAULT_PLATFORM_COLOR = "#9CA3AF";

// Selectable palette for custom (manually-entered or managed) platforms.
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

/** The color dot to show for an entry: managed platforms use their
 * assigned color; unmanaged (manually-entered) platforms use their chosen
 * color, or the default. */
export function getPlatformColor(
  platform: string,
  managedPlatforms: PlatformEntry[],
  customColor?: string,
): string {
  const managed = managedPlatforms.find((p) => p.name === platform);
  if (managed) {
    return managed.color;
  }
  return customColor ?? DEFAULT_PLATFORM_COLOR;
}
