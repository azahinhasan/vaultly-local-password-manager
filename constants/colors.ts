export const Colors = {
  light: {
    background: "#ffffff",
    text: "#1a1a1a",
    subtext: "#666666",
    border: "#999999",
    borderFilled: "#333333",
    dot: "#333333",
    accent: "#2563eb",
    error: "#c0392b",
    card: "#f5f5f7",
  },
  dark: {
    background: "#000000",
    text: "#f2f2f2",
    subtext: "#a1a1a1",
    border: "#5a5a5a",
    borderFilled: "#e5e5e5",
    dot: "#e5e5e5",
    accent: "#5b9bff",
    error: "#ff6b5e",
    card: "#1c1c1e",
  },
};

export type ThemeColors = typeof Colors.light;
