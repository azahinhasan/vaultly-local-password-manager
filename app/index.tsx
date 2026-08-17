import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { isLoading, isPinSetup, isAuthenticated } = useAuth();
  const colors = useThemeColors();

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!isPinSetup) {
    return <Redirect href="/pin-setup" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/pin-unlock" />;
  }

  return <Redirect href="/vault" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
