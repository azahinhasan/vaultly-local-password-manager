import { PinBoxInput } from "@/components/PinBoxInput";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 4;

export default function PinUnlockScreen() {
  const { unlockWithPin, lockedUntil: contextLockedUntil } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(
    contextLockedUntil,
  );
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (secondsLeft <= 0) {
        setLockedUntil(null);
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(secondsLeft);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = remainingSeconds > 0;
  const canSubmit = pin.length === PIN_LENGTH && !isChecking && !isLocked;

  const handleChange = (value: string) => {
    setPin(value);
    setError("");
  };

  const handleUnlock = async () => {
    if (!canSubmit) {
      return;
    }

    setIsChecking(true);
    const result = await unlockWithPin(pin);
    setIsChecking(false);

    if (result.success) {
      router.replace("/vault");
      return;
    }

    setPin("");
    if (result.lockedUntil) {
      setLockedUntil(result.lockedUntil);
    } else {
      setError("Incorrect PIN. Try again.");
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
          Enter your PIN
        </Text>
        <PinBoxInput
          length={PIN_LENGTH}
          value={pin}
          onChangeText={handleChange}
          autoFocus={!isLocked}
          editable={!isChecking && !isLocked}
        />
        {isLocked ? (
          <Text style={[styles.error, { color: colors.error }]}>
            Too many attempts. Try again in {remainingSeconds}s.
          </Text>
        ) : (
          !!error && (
            <Text style={[styles.error, { color: colors.error }]}>
              {error}
            </Text>
          )
        )}

        <Pressable
          onPress={handleUnlock}
          disabled={!canSubmit}
          style={[
            styles.unlockButton,
            {
              backgroundColor: colors.accent,
              opacity: canSubmit ? 1 : 0.5,
            },
          ]}
        >
          <Text style={styles.unlockButtonText}>
            {isChecking ? "Checking..." : "Unlock"}
          </Text>
        </Pressable>
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
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    textAlign: "center",
  },
  unlockButton: {
    marginTop: 20,
    width: 200,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  unlockButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
