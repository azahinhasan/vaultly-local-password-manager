import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import {
  DARK_MODES,
  FIXED_THEMES,
  systemDarkTheme,
  systemLightTheme,
  THEME_OPTIONS,
  ThemeMode,
  ThemeTokens,
} from "../constants/theme";

const STORAGE_KEY = "themeMode";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  tokens: ThemeTokens;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isThemeMode(value: string): value is ThemeMode {
  return THEME_OPTIONS.some((o) => o.mode === value);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("warm");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && isThemeMode(stored)) {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const isDark =
    DARK_MODES.includes(mode) || (mode === "system" && systemScheme === "dark");
  const tokens =
    FIXED_THEMES[mode] ?? (isDark ? systemDarkTheme : systemLightTheme);

  return (
    <ThemeContext.Provider value={{ mode, setMode, tokens, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
