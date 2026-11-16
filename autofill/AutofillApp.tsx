import { Monogram } from "@/components/Brutal";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { PinBoxInput } from "@/components/PinBoxInput";
import { PLATFORM_TARGETS } from "@/constants/platforms";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PlatformsProvider, usePlatforms } from "@/context/PlatformsContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { FillTarget, rankForTarget } from "@/utils/autofill-match";
import { isBiometricAvailable, isBiometricEnabled } from "@/utils/biometric";
import { loadEncryptedVault, VaultEntry } from "@/utils/vault-storage";
import { cancelAutofill, finishWithCredentials, getAutofillRequest } from "@/modules/vaultly-autofill";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

const PIN_LENGTH = 6;
const NO_TARGET: FillTarget = { packageName: null, webDomain: null };

/**
 * Root of the autofill screen. Android launches it (through the native
 * VaultlyAutofillActivity) when you tap a login field elsewhere. The vault is
 * still locked here: unlock first, then pick the login to fill.
 */
export default function AutofillApp() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SecurityProvider>
          <AuthProvider>
            <PlatformsProvider>
              <AutofillFlow />
            </PlatformsProvider>
          </AuthProvider>
        </SecurityProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AutofillFlow() {
  const { vaultKey, isLoading, isPinSetup } = useAuth();
  const colors = useThemeColors();
  const target = useMemo(() => getAutofillRequest() ?? NO_TARGET, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!isPinSetup) {
    return (
      <Message
        title="Set up Vaultly first"
        body="Open the Vaultly app and create your PIN, then try again."
      />
    );
  }

  return vaultKey ? <PickLogin target={target} /> : <Unlock target={target} />;
}

const targetLabel = (t: FillTarget) => t.webDomain || t.packageName || "this app";

function Unlock({ target }: { target: FillTarget }) {
  const { unlockWithPin, unlockWithBiometric, lockedUntil } = useAuth();
  const colors = useThemeColors();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(0);
  const [hasBiometric, setHasBiometric] = useState(false);
  const locked = !!lockedUntil && lockedUntil > Date.now();

  const tryBiometric = async () => {
    await unlockWithBiometric(); // success flips vaultKey and shows the picker
  };

  useEffect(() => {
    (async () => {
      const on = (await isBiometricEnabled()) && (await isBiometricAvailable());
      setHasBiometric(on);
      if (on) tryBiometric();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (value: string) => {
    setPin(value);
    setError("");
    if (value.length !== PIN_LENGTH) return;
    setChecking(true);
    // Let the last dot paint before PBKDF2 blocks the JS thread.
    setTimeout(async () => {
      const result = await unlockWithPin(value);
      setChecking(false);
      if (!result.success) {
        setPin("");
        setShake((n) => n + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(result.lockedUntil ? "Too many attempts. Try again shortly." : "Incorrect PIN. Try again.");
      }
    }, 0);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <Pressable onPress={cancelAutofill} style={styles.cancel} accessibilityRole="button">
        <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
      </Pressable>
      <PinBoxInput
        fullScreen
        length={PIN_LENGTH}
        value={pin}
        onChangeText={onChange}
        editable={!checking && !locked}
        onBiometric={hasBiometric ? tryBiometric : undefined}
        shakeSignal={shake}
        header={
          <>
            <Text style={[styles.title, { color: colors.text }]}>Unlock Vaultly</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              to fill a login for {targetLabel(target)}
            </Text>
          </>
        }
        footer={
          <>
            {checking && <ActivityIndicator color={colors.accent} />}
            {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          </>
        }
      />
    </SafeAreaView>
  );
}

function PickLogin({ target }: { target: FillTarget }) {
  const { vaultKey } = useAuth();
  const { platforms } = usePlatforms();
  const colors = useThemeColors();
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!vaultKey) return;
    loadEncryptedVault(vaultKey).then(setEntries).catch(() => setFailed(true));
  }, [vaultKey]);

  const { matches, others } = useMemo(
    () => rankForTarget(entries ?? [], target, PLATFORM_TARGETS),
    [entries, target],
  );

  if (failed) {
    return <Message title="Couldn't open your vault" body="Close this and try again." />;
  }
  if (!entries) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const row = (entry: VaultEntry) => {
    const color = platforms.find((p) => p.name === entry.platform)?.color;
    const login = entry.username || entry.email || "No username";
    return (
      <NeoBrutalCard
        key={entry.id}
        onPress={() => finishWithCredentials(entry.username || entry.email || "", entry.password)}
        accessibilityLabel={`Fill ${entry.platform}, ${login}`}
      >
        <View style={styles.row}>
          <Monogram name={entry.platform} color={color} />
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {entry.platform}
            </Text>
            <Text style={[styles.rowSub, { color: colors.subtext }]} numberOfLines={1}>
              {login}
            </Text>
          </View>
        </View>
      </NeoBrutalCard>
    );
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Fill login</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
            for {targetLabel(target)}
          </Text>
        </View>
        <Pressable onPress={cancelAutofill} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.cancelText, { color: colors.accent }]}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {matches.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.subtext }]}>Matches</Text>
            {matches.map(row)}
          </>
        )}
        {others.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.subtext }]}>
              {matches.length > 0 ? "Other logins" : "No saved login matches this site — choose carefully"}
            </Text>
            {others.map(row)}
          </>
        )}
        {entries.length === 0 && (
          <Text style={[styles.subtitle, { color: colors.subtext }]}>Your vault is empty.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  const colors = useThemeColors();
  return (
    <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, styles.msgBody, { color: colors.subtext }]}>{body}</Text>
      <Pressable onPress={cancelAutofill} accessibilityRole="button" style={styles.msgButton}>
        <Text style={[styles.cancelText, { color: colors.accent }]}>Close</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  cancel: { position: "absolute", top: 24, left: 24, zIndex: 1 },
  cancelText: { fontSize: 16, fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  error: { fontWeight: "700", textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 24, paddingBottom: 8 },
  headerText: { flexShrink: 1, gap: 2 },
  list: { padding: 24, gap: 12 },
  section: { fontSize: 13, fontWeight: "800", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowSub: { fontSize: 13, fontWeight: "600" },
  msgBody: { marginTop: 4 },
  msgButton: { marginTop: 16 },
});
