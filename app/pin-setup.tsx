import { PinBoxInput } from "@/components/PinBoxInput";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 6;

export default function PinSetupScreen() {
  const { setupPin } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const [stage, setStage] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setStage("create");
    setPin("");
    setConfirmPin("");
  };

  const handleCreateChange = (value: string) => {
    setError("");
    setPin(value);
    if (value.length === PIN_LENGTH) {
      setStage("confirm");
    }
  };

  const handleConfirmChange = async (value: string) => {
    setError("");
    setConfirmPin(value);

    if (value.length !== PIN_LENGTH) {
      return;
    }

    if (value !== pin) {
      setError("PINs don't match. Try again.");
      reset();
      return;
    }

    try {
      setIsSaving(true);
      await setupPin(pin);
      router.replace("/vault");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set up PIN.");
      reset();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          {stage === "create" ? "Create a PIN" : "Confirm your PIN"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {stage === "create"
            ? `Choose a ${PIN_LENGTH}-digit PIN to protect your vault`
            : "Enter your PIN again to confirm"}
        </Text>

        {stage === "create" ? (
          <PinBoxInput
            key="create"
            length={PIN_LENGTH}
            value={pin}
            onChangeText={handleCreateChange}
            autoFocus
            editable={!isSaving}
          />
        ) : (
          <PinBoxInput
            key="confirm"
            length={PIN_LENGTH}
            value={confirmPin}
            onChangeText={handleConfirmChange}
            autoFocus
            editable={!isSaving}
          />
        )}

        {isSaving && (
          <ActivityIndicator style={styles.spinner} color={colors.accent} />
        )}

        {!!error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  spinner: {
    marginTop: 8,
  },
  error: {
    marginTop: 12,
    fontWeight: "700",
  },
});
