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

export type ThemeMode = "system" | "light" | "dark" | "warm";

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
    mode: "dark",
    label: "Dark",
    preview: [systemDarkTheme.background, systemDarkTheme.accent],
  },
  {
    mode: "warm",
    label: "Warm",
    preview: [warmTheme.background, warmTheme.accent],
  },
];
