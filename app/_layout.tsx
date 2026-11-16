import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PlatformsProvider } from "@/context/PlatformsContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// When the vault locks (Lock now / auto-lock), drop the whole stack and show
// the PIN screen so no decrypted screen stays reachable via Back.
function LockRedirect() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      if (router.canDismiss()) router.dismissAll();
      router.replace("/pin-unlock");
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, router]);

  return null;
}

function RootStack() {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LockRedirect />
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
        <SecurityProvider>
          <AuthProvider>
            <PlatformsProvider>
              <RootStack />
            </PlatformsProvider>
          </AuthProvider>
        </SecurityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
