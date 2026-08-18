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
  systemDarkTheme,
  systemLightTheme,
  ThemeMode,
  ThemeTokens,
  warmTheme,
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
  return (
    value === "system" ||
    value === "light" ||
    value === "dark" ||
    value === "warm"
  );
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
    mode === "dark" || (mode === "system" && systemScheme === "dark");
  const tokens =
    mode === "warm"
      ? warmTheme
      : isDark
        ? systemDarkTheme
        : systemLightTheme;

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
