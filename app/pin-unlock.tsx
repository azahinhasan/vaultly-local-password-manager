import { PinBoxInput } from "@/components/PinBoxInput";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { isBiometricEnabled } from "@/utils/biometric";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 6;

export default function PinUnlockScreen() {
  const {
    unlockWithPin,
    unlockWithBiometric,
    lockedUntil: contextLockedUntil,
  } = useAuth();
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

  const [hasBiometric, setHasBiometric] = useState(false);

  const tryBiometric = async () => {
    if (await unlockWithBiometric()) {
      router.replace("/vault");
    }
  };

  useEffect(() => {
    isBiometricEnabled().then((enabled) => {
      setHasBiometric(enabled);
      if (enabled) tryBiometric();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLocked = remainingSeconds > 0;

  const performUnlock = async (value: string) => {
    const result = await unlockWithPin(value);
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

  const handleChange = (value: string) => {
    setPin(value);
    setError("");

    if (value.length !== PIN_LENGTH) {
      return;
    }

    // Let the filled-in last digit (and the spinner below) actually paint
    // before the PIN verification's PBKDF2 work blocks the JS thread.
    setIsChecking(true);
    setTimeout(() => performUnlock(value), 0);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Enter your PIN
        </Text>
        <PinBoxInput
          length={PIN_LENGTH}
          value={pin}
          onChangeText={handleChange}
          autoFocus={!isLocked && !isChecking}
          editable={!isChecking && !isLocked}
        />

        {isChecking && (
          <ActivityIndicator style={styles.spinner} color={colors.accent} />
        )}

        {isLocked ? (
          <Text style={[styles.error, { color: colors.error }]}>
            Too many attempts. Try again in {remainingSeconds}s.
          </Text>
        ) : (
          !!error && (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )
        )}
        {hasBiometric && (
          <Pressable onPress={tryBiometric} style={styles.bio}>
            <Ionicons name="finger-print" size={40} color={colors.text} />
          </Pressable>
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
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 24,
    paddingTop: 200,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  bio: {
    marginTop: 24,
  },
  spinner: {
    marginTop: 8,
  },
  error: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "700",
  },
});
