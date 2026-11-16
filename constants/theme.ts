export interface ThemeTokens {
  background: string;
  surface: string;
  text: string;
  subtext: string;
  border: string;
  accent: string;
  accentText: string;
  highlight: string;
  highlightText: string;
  shadow: string;
  success: string;
  error: string;
  errorText: string;
}

export type ThemeMode =
  | "system"
  | "light"
  | "dark"
  | "warm"
  | "mint"
  | "amoled"
  | "midnight"
  | "dusk";

export const BORDER_WIDTH = 2;
export const RADIUS = 14;
export const SHADOW_OFFSET = 3;

export const systemLightTheme: ThemeTokens = {
  background: "#F5F0E6",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  subtext: "#6B665C",
  border: "#1A1A1A",
  accent: "#2F5BFF",
  accentText: "#FFFFFF",
  highlight: "#FFD84D",
  highlightText: "#1A1A1A",
  shadow: "#1A1A1A",
  success: "#1E9E5A",
  error: "#D9382C",
  errorText: "#FFFFFF",
};

export const systemDarkTheme: ThemeTokens = {
  background: "#1C1C1C",
  surface: "#272727",
  text: "#F3EEE4",
  subtext: "#A39E94",
  border: "#F3EEE4",
  accent: "#3D63FF",
  accentText: "#FFFFFF",
  highlight: "#FFD84D",
  highlightText: "#1A1A1A",
  shadow: "#F3EEE4",
  success: "#3DC27C",
  error: "#FF6B5E",
  errorText: "#1A1A1A",
};

export const warmTheme: ThemeTokens = {
  background: "#F8E7D1",
  surface: "#FFF8EC",
  text: "#2B1A12",
  subtext: "#7A5F50",
  border: "#2B1A12",
  accent: "#E8573A",
  accentText: "#FFFFFF",
  highlight: "#FFC145",
  highlightText: "#2B1A12",
  shadow: "#2B1A12",
  success: "#2E8B57",
  error: "#B3261E",
  errorText: "#FFFFFF",
};

// Light: fresh mint with a green accent.
export const mintTheme: ThemeTokens = {
  background: "#E8F5EC",
  surface: "#FFFFFF",
  text: "#10231A",
  subtext: "#4F6A5C",
  border: "#10231A",
  accent: "#0C8A57",
  accentText: "#FFFFFF",
  highlight: "#FFE066",
  highlightText: "#10231A",
  shadow: "#10231A",
  success: "#0C8A57",
  error: "#C62828",
  errorText: "#FFFFFF",
};

// Dark: true black for OLED screens, neon green accent.
export const amoledTheme: ThemeTokens = {
  background: "#000000",
  surface: "#0F0F0F",
  text: "#F2F2F2",
  subtext: "#9A9A9A",
  border: "#E6E6E6",
  accent: "#00E5A0",
  accentText: "#00140D",
  highlight: "#FFD84D",
  highlightText: "#1A1A1A",
  shadow: "#E6E6E6",
  success: "#3DDC97",
  error: "#FF6B6B",
  errorText: "#1A1A1A",
};

// Dark: deep navy with a periwinkle accent.
export const midnightTheme: ThemeTokens = {
  background: "#0B1020",
  surface: "#151C36",
  text: "#E8ECFF",
  subtext: "#9AA5CC",
  border: "#D5DCFF",
  accent: "#5468FF",
  accentText: "#FFFFFF",
  highlight: "#FFD84D",
  highlightText: "#1A1A1A",
  shadow: "#D5DCFF",
  success: "#4ADE9A",
  error: "#FF7A7A",
  errorText: "#1A1A1A",
};

// Dark: deep purple with a pink-violet accent.
export const duskTheme: ThemeTokens = {
  background: "#170F24",
  surface: "#241838",
  text: "#F3EAFF",
  subtext: "#B3A3CE",
  border: "#E7D8FF",
  accent: "#A855F7",
  accentText: "#FFFFFF",
  highlight: "#FF9ED1",
  highlightText: "#2A1230",
  shadow: "#E7D8FF",
  success: "#5EE0A0",
  error: "#FF7F9D",
  errorText: "#2A1230",
};

/** Themes with their own fixed palette; system/light/dark resolve from the device setting. */
export const FIXED_THEMES: Partial<Record<ThemeMode, ThemeTokens>> = {
  warm: warmTheme,
  mint: mintTheme,
  amoled: amoledTheme,
  midnight: midnightTheme,
  dusk: duskTheme,
};

/** Modes that use a dark palette (status bar and system UI go light). */
export const DARK_MODES: ThemeMode[] = ["dark", "amoled", "midnight", "dusk"];

// Two-color swatch shown on each Appearance tile.
export const THEME_OPTIONS: {
  mode: ThemeMode;
  label: string;
  preview: [string, string];
}[] = [
  {
    mode: "system",
    label: "System default",
    preview: [systemLightTheme.background, systemDarkTheme.background],
  },
  {
    mode: "light",
    label: "Light",
    preview: [systemLightTheme.background, systemLightTheme.accent],
  },
  {
    mode: "mint",
    label: "Mint",
    preview: [mintTheme.background, mintTheme.accent],
  },
  {
    mode: "warm",
    label: "Warm",
    preview: [warmTheme.background, warmTheme.accent],
  },
  {
    mode: "dark",
    label: "Dark",
    preview: [systemDarkTheme.background, systemDarkTheme.accent],
  },
  {
    mode: "amoled",
    label: "AMOLED black",
    preview: [amoledTheme.background, amoledTheme.accent],
  },
  {
    mode: "midnight",
    label: "Midnight",
    preview: [midnightTheme.background, midnightTheme.accent],
  },
  {
    mode: "dusk",
    label: "Dusk",
    preview: [duskTheme.background, duskTheme.accent],
  },
];
