import { useTheme } from "@/context/ThemeContext";

export function useThemeColors() {
  return useTheme().tokens;
}
