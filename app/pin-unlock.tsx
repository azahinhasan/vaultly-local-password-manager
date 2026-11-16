import { PinBoxInput } from "@/components/PinBoxInput";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  isBiometricAllowed,
  isBiometricAvailable,
  isBiometricEnabled,
} from "@/utils/biometric";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PIN_LENGTH = 6;
const appIcon = require("@/assets/images/lock-icon.png");

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
  const [hasBiometric, setHasBiometric] = useState(false);
  const [pinNote, setPinNote] = useState("");
  const [shakeSignal, setShakeSignal] = useState(0);

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

  const tryBiometric = async () => {
    if (await unlockWithBiometric()) {
      router.replace("/vault");
    }
  };

  useEffect(() => {
    (async () => {
      const enabled =
        (await isBiometricEnabled()) && (await isBiometricAvailable());
      if (!enabled) return;
      // Biometrics are only allowed for a while after the last manual PIN entry.
      if (!(await isBiometricAllowed())) {
        setPinNote("For your security, enter your PIN. Biometric unlock resumes after it.");
        return;
      }
      setHasBiometric(true);
      tryBiometric();
    })();
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
    setShakeSignal((n) => n + 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      <View style={styles.inner}>
        <PinBoxInput
          fullScreen
          length={PIN_LENGTH}
          value={pin}
          onChangeText={handleChange}
          editable={!isChecking && !isLocked}
          onBiometric={hasBiometric ? tryBiometric : undefined}
          shakeSignal={shakeSignal}
          header={
            <>
              <Image source={appIcon} style={styles.badge} resizeMode="contain" />
              <Text style={[styles.title, { color: colors.text }]}>
                Enter your PIN
              </Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                Your vault never leaves this device
              </Text>
            </>
          }
          footer={
            <>
              {isChecking && (
                <ActivityIndicator
                  style={styles.spinner}
                  color={colors.accent}
                />
              )}
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
              {!isLocked && !error && !!pinNote && (
                <Text style={[styles.note, { color: colors.subtext }]}>
                  {pinNote}
                </Text>
              )}
            </>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  // Transparent shield icon (assets/images/lock-icon.png, 419x544).
  badge: {
    width: 84,
    height: 108,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  spinner: {
    marginTop: 8,
  },
  note: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "700",
  },
});
