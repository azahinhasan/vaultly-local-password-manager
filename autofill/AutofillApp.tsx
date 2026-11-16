import { BrutalChip, BrutalTextField, Monogram } from "@/components/Brutal";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { PinBoxInput } from "@/components/PinBoxInput";
import { SaveLogin } from "./SaveLogin";
import { PLATFORM_TARGETS } from "@/constants/platforms";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PlatformsProvider, usePlatforms } from "@/context/PlatformsContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { FillTarget, rankForTarget } from "@/utils/autofill-match";
import { isBiometricAvailable, isBiometricEnabled } from "@/utils/biometric";
import { filterEntries, usedCategories } from "@/utils/vault-filter";
import { loadEncryptedVault, VaultEntry } from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import { cancelAutofill, finishWithCredentials, getAutofillRequest } from "@/modules/vaultly-autofill";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const request = useMemo(() => getAutofillRequest(), []);
  const target = request ?? NO_TARGET;
  const saving = request?.mode === "save";

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

  if (!vaultKey) return <Unlock target={target} saving={saving} />;
  return saving ? (
    <SaveLogin
      target={target}
      username={request?.username ?? ""}
      password={request?.password ?? ""}
    />
  ) : (
    <PickLogin target={target} />
  );
}

const targetLabel = (t: FillTarget) => t.webDomain || t.packageName || "this app";

function Unlock({ target, saving }: { target: FillTarget; saving: boolean }) {
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
              {saving ? `to save this login from ${targetLabel(target)}` : `to fill a login for ${targetLabel(target)}`}
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

type Row =
  | { kind: "header"; key: string; title: string }
  | { kind: "entry"; key: string; entry: VaultEntry };

function PickLogin({ target }: { target: FillTarget }) {
  const { vaultKey } = useAuth();
  const { platforms } = usePlatforms();
  const colors = useThemeColors();
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!vaultKey) return;
    loadEncryptedVault(vaultKey).then(setEntries).catch(() => setFailed(true));
  }, [vaultKey]);

  const categories = useMemo(
    () => usedCategories(entries ?? [], platforms),
    [entries, platforms],
  );

  // Search/category narrow the list first; the site's own logins still come first.
  const rows = useMemo<Row[]>(() => {
    const visible = filterEntries(entries ?? [], query, category, platforms);
    const { matches, others } = rankForTarget(visible, target, PLATFORM_TARGETS);
    const out: Row[] = [];
    if (matches.length > 0) {
      out.push({ kind: "header", key: "h-matches", title: "Matches" });
      matches.forEach((entry) => out.push({ kind: "entry", key: entry.id, entry }));
    }
    if (others.length > 0) {
      out.push({
        kind: "header",
        key: "h-others",
        title:
          matches.length > 0
            ? "Other logins"
            : "No saved login matches this site — choose carefully",
      });
      others.forEach((entry) => out.push({ kind: "entry", key: entry.id, entry }));
    }
    return out;
  }, [entries, query, category, platforms, target]);

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

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === "header") {
      return <Text style={[styles.section, { color: colors.subtext }]}>{item.title}</Text>;
    }
    const { entry } = item;
    const color = platforms.find((p) => p.name === entry.platform)?.color;
    const login = entry.username || entry.email || "No username";
    return (
      <NeoBrutalCard
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

      <View style={styles.filters}>
        <BrutalTextField
          value={query}
          onChangeText={setQuery}
          placeholder="Search by platform, username or email"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search logins"
          left={<Ionicons name="search" size={18} color={colors.subtext} style={styles.searchIcon} />}
        />
        {categories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <BrutalChip label="All" selected={!category} onPress={() => setCategory(null)} />
            {categories.map((c) => (
              <BrutalChip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={15}
        ListEmptyComponent={
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {entries.length === 0 ? "Your vault is empty." : "No logins match your search."}
          </Text>
        }
      />
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
  filters: { paddingHorizontal: 24, gap: 12 },
  searchIcon: { marginRight: 10 },
  chips: { gap: 8, paddingRight: 24 },
  section: { fontSize: 13, fontWeight: "800", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowSub: { fontSize: 13, fontWeight: "600" },
  msgBody: { marginTop: 4 },
  msgButton: { marginTop: 16 },
});
