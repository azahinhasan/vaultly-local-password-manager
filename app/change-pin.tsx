import { PinBoxInput } from "@/components/PinBoxInput";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 4;

type Stage = "current" | "create" | "confirm";

export default function ChangePinScreen() {
  const { vaultKey, verifyCurrentPin, changePin } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const [stage, setStage] = useState<Stage>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const resetToStart = () => {
    setStage("current");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleCurrentChange = async (value: string) => {
    setError("");
    setCurrentPin(value);

    if (value.length !== PIN_LENGTH) {
      return;
    }

    setIsChecking(true);
    const isValid = await verifyCurrentPin(value);
    setIsChecking(false);

    if (isValid) {
      setStage("create");
    } else {
      setError("Incorrect PIN. Try again.");
      setCurrentPin("");
    }
  };

  const handleCreateChange = (value: string) => {
    setError("");
    setNewPin(value);
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

    if (value !== newPin) {
      setError("PINs don't match. Try again.");
      setNewPin("");
      setConfirmPin("");
      setStage("create");
      return;
    }

    setIsSaving(true);
    const result = await changePin(currentPin, newPin);
    setIsSaving(false);

    if (result.success) {
      router.back();
    } else {
      setError(result.error ?? "Failed to change PIN.");
      resetToStart();
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
        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={[styles.cancelText, { color: colors.accent }]}>
            Cancel
          </Text>
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>
          {stage === "current"
            ? "Enter current PIN"
            : stage === "create"
              ? "Create a new PIN"
              : "Confirm new PIN"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {stage === "current"
            ? "Verify it's you before changing your PIN"
            : stage === "create"
              ? `Choose a new ${PIN_LENGTH}-digit PIN`
              : "Enter your new PIN again to confirm"}
        </Text>

        {stage === "current" && (
          <PinBoxInput
            key="current"
            length={PIN_LENGTH}
            value={currentPin}
            onChangeText={handleCurrentChange}
            autoFocus
            editable={!isChecking}
          />
        )}
        {stage === "create" && (
          <PinBoxInput
            key="create"
            length={PIN_LENGTH}
            value={newPin}
            onChangeText={handleCreateChange}
            autoFocus
            editable={!isSaving}
          />
        )}
        {stage === "confirm" && (
          <PinBoxInput
            key="confirm"
            length={PIN_LENGTH}
            value={confirmPin}
            onChangeText={handleConfirmChange}
            autoFocus
            editable={!isSaving}
          />
        )}

        {(isChecking || isSaving) && (
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
  cancelButton: {
    position: "absolute",
    top: 24,
    left: 24,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  spinner: {
    marginTop: 8,
  },
  error: {
    marginTop: 12,
    textAlign: "center",
  },
});
