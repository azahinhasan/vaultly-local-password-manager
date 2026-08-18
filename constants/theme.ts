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
  error: string;
  errorText: string;
}

export type ThemeMode = "system" | "light" | "dark" | "warm";

export const BORDER_WIDTH = 2.5;
export const RADIUS = 12;
export const SHADOW_OFFSET = 5;

export const systemLightTheme: ThemeTokens = {
  background: "#F5F1EA",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  subtext: "#6B6559",
  border: "#1A1A1A",
  accent: "#2D5BFF",
  accentText: "#FFFFFF",
  highlight: "#FFDE59",
  highlightText: "#1A1A1A",
  shadow: "#1A1A1A",
  error: "#D93B3B",
  errorText: "#FFFFFF",
};

export const systemDarkTheme: ThemeTokens = {
  background: "#1A1A1A",
  surface: "#262626",
  text: "#F5F1EA",
  subtext: "#B5AFA2",
  border: "#F5F1EA",
  accent: "#2D5BFF",
  accentText: "#FFFFFF",
  highlight: "#F5C84C",
  highlightText: "#1A1A1A",
  shadow: "#F5F1EA",
  error: "#FF6B6B",
  errorText: "#1A1A1A",
};

export const warmTheme: ThemeTokens = {
  background: "#F0EBDD",
  surface: "#FFFFFF",
  text: "#1A1A1A",
  subtext: "#6B6559",
  border: "#1A1A1A",
  accent: "#F0603C",
  accentText: "#FFFFFF",
  highlight: "#FFDE59",
  highlightText: "#1A1A1A",
  shadow: "#1A1A1A",
  error: "#D93B3B",
  errorText: "#FFFFFF",
};

export const THEME_OPTIONS: {
  mode: ThemeMode;
  label: string;
  description: string;
  preview: { background: string; accent: string };
}[] = [
  {
    mode: "system",
    label: "System Default",
    description: "Follows your device's light/dark setting",
    preview: {
      background: systemLightTheme.background,
      accent: systemLightTheme.accent,
    },
  },
  {
    mode: "light",
    label: "Light",
    description: "Always light, regardless of device setting",
    preview: {
      background: systemLightTheme.background,
      accent: systemLightTheme.accent,
    },
  },
  {
    mode: "dark",
    label: "Dark",
    description: "Always dark, regardless of device setting",
    preview: {
      background: systemDarkTheme.background,
      accent: systemDarkTheme.accent,
    },
  },
  {
    mode: "warm",
    label: "Warm",
    description: "A fixed warm palette that never switches to dark",
    preview: {
      background: warmTheme.background,
      accent: warmTheme.accent,
    },
  },
];
