import {
  BrutalTextField,
  useSnackbar,
} from "@/components/Brutal";
import { KeyboardScroll } from "@/components/KeyboardScroll";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { OTHER_CATEGORY, PLATFORM_TARGETS } from "@/constants/platforms";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { cancelAutofill } from "@/modules/vaultly-autofill";
import {
  FillTarget,
  classifyIdentifier,
  FieldKind,
  findExistingEntry,
  guessPlatformName,
} from "@/utils/autofill-match";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * "Save to Vaultly?" screen: shown after you unlock, for a login that was just
 * submitted in another app or browser. Offers to add it, or to update the
 * password when the same account is already saved.
 */
export function SaveLogin({
  target,
  username: typedUsername,
  usernameKind,
  password: typedPassword,
}: {
  target: FillTarget;
  username: string;
  usernameKind: FieldKind | null;
  password: string;
}) {
  const { vaultKey } = useAuth();
  const { platforms, addPlatform, markPlatformUsed } = usePlatforms();
  const colors = useThemeColors();
  const [snackbar, showSnackbar] = useSnackbar();

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [platform, setPlatform] = useState(() =>
    guessPlatformName(target, PLATFORM_TARGETS),
  );
  const [username, setUsername] = useState(typedUsername);
  const [password, setPassword] = useState(typedPassword);
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vaultKey) return;
    loadEncryptedVault(vaultKey)
      .then(setEntries)
      .catch(() => setError("Couldn't open your vault."));
  }, [vaultKey]);

  const existing = useMemo(
    () =>
      entries
        ? findExistingEntry(entries, target, username, PLATFORM_TARGETS)
        : undefined,
    [entries, target, username],
  );
  const unchanged = !!existing && existing.password === password;
  const site = target.webDomain || target.packageName || "";

  const save = async () => {
    if (!vaultKey || !entries) return;
    const typedName = platform.trim();
    if (!existing && !typedName) {
      setError("Enter a platform name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let updated: VaultEntry[];
      if (existing) {
        updated = entries.map((e) =>
          e === existing
            ? {
                ...e,
                password,
                website: e.website ?? (site || undefined),
                ...(notes.trim() ? { notes: notes.trim() } : {}),
              }
            : e,
        );
      } else {
        // Reuse an existing platform's exact spelling; otherwise create one.
        const known = platforms.find(
          (p) => p.name.toLowerCase() === typedName.toLowerCase(),
        );
        const name = known?.name ?? typedName;
        if (!known) {
          const added = await addPlatform(name, OTHER_CATEGORY);
          if (!added.success) {
            setError(added.error ?? "Couldn't add that platform.");
            setSaving(false);
            return;
          }
        }
        const u = username.trim();
        // Phone, email or username: trust the form field, else look at the value.
        const kind =
          usernameKind === "phone" || usernameKind === "email"
            ? usernameKind
            : classifyIdentifier(u);
        updated = [
          ...entries,
          {
            id: Crypto.randomUUID(),
            platform: name,
            ...(!u ? {} : kind === "phone" ? { phone: u } : kind === "email" ? { email: u } : { username: u }),
            password,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
            ...(site ? { website: site } : {}),
          },
        ];
        await markPlatformUsed(name);
      }
      await saveEncryptedVault(updated, vaultKey);
      showSnackbar(existing ? "Changes saved" : "Saved to your vault");
      setTimeout(cancelAutofill, 700);
    } catch {
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  };

  if (!entries && !error) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Save login?</Text>
          {!!site && (
            <Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
              from {site}
            </Text>
          )}
        </View>
        <Pressable onPress={cancelAutofill} accessibilityRole="button" hitSlop={12}>
          <Text style={[styles.cancel, { color: colors.accent }]}>Not now</Text>
        </Pressable>
      </View>

      <KeyboardScroll contentContainerStyle={styles.form}>
        {!!existing && (
          <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.highlight }]}>
            <Ionicons name="information-circle" size={20} color={colors.highlightText} />
            <Text style={[styles.noticeText, { color: colors.highlightText }]}>
              {unchanged
                ? "This login is already saved."
                : `You already have a login for this account (${existing.platform}). Save to update its password.`}
            </Text>
          </View>
        )}

        {!existing && (
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Platform</Text>
            <BrutalTextField
              value={platform}
              onChangeText={setPlatform}
              placeholder="e.g. Facebook"
              maxLength={16}
              autoCapitalize="words"
            />
          </View>
        )}

        <View>
          <Text style={[styles.label, { color: colors.text }]}>Username, email or phone</Text>
          <BrutalTextField
            value={username}
            onChangeText={setUsername}
            placeholder="Username, email or phone"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View>
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <BrutalTextField
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            right={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            }
          />
        </View>

        <View>
          <View style={styles.labelRow}>
            <Text style={[styles.label, styles.labelInRow, { color: colors.text }]}>Notes</Text>
            <Text style={[styles.hint, { color: colors.subtext }]}>Optional</Text>
          </View>
          <BrutalTextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else worth remembering"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            style={styles.notes}
          />
        </View>

        {!!error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      </KeyboardScroll>

      <View style={styles.actions}>
        {unchanged ? (
          <NeoBrutalButton label="Close" onPress={cancelAutofill} />
        ) : (
          <NeoBrutalButton
            label={saving ? "Saving..." : existing ? "Update password" : "Save to Vaultly"}
            onPress={save}
            disabled={saving || !password}
          />
        )}
      </View>

      {snackbar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  headerText: { flexShrink: 1, gap: 2 },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 14, fontWeight: "600" },
  cancel: { fontSize: 16, fontWeight: "800" },
  form: { padding: 16, gap: 16 },
  label: { fontSize: 14, fontWeight: "800", marginBottom: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  labelInRow: { marginBottom: 0 },
  hint: { fontSize: 13, fontWeight: "600" },
  notes: { minHeight: 64 },
  notice: { flexDirection: "row", gap: 10, borderWidth: 2, borderRadius: 14, padding: 12, alignItems: "center" },
  noticeText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  error: { fontSize: 13, fontWeight: "700" },
  actions: { padding: 16, paddingTop: 8 },
});
