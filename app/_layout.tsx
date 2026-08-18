import { AuthProvider } from "@/context/AuthContext";
import { PlatformsProvider } from "@/context/PlatformsContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootStack() {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <PlatformsProvider>
            <RootStack />
          </PlatformsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
