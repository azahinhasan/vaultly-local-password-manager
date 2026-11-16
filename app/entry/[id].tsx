import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import {
  BrutalIconButton,
  BrutalTextField,
  Monogram,
  useSnackbar,
} from "@/components/Brutal";
import { KeyboardScroll } from "@/components/KeyboardScroll";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { PlatformSheet } from "@/components/PlatformSheet";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useSecurity } from "@/context/SecurityContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { pwnedCount } from "@/utils/breach";
import {
  generatePassword,
  passwordStrength,
  STRENGTH_LABELS,
} from "@/utils/password";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const AMBER = "#F29A1F";
const YELLOW = "#C8B400";

export default function EntryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaultKey } = useAuth();
  const { platforms, markPlatformUsed } = usePlatforms();
  const router = useRouter();
  const colors = useThemeColors();
  const [snackbar, showSnackbar] = useSnackbar();
  const { breachAlerts } = useSecurity();

  const isNew = id === "new";

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    options: AppDialogOption[];
  } | null>(null);
  const closeDialog = () => setDialog(null);

  useEffect(() => {
    if (!vaultKey) {
      return;
    }

    loadEncryptedVault(vaultKey)
      .then((vault) => {
        setEntries(vault);
        if (!isNew) {
          const existing = vault.find((entry) => entry.id === id);
          if (existing) {
            setPlatform(existing.platform);
            setUsername(existing.username ?? "");
            setEmail(existing.email ?? "");
            setPhone(existing.phone ?? "");
            setWebsite(existing.website ?? "");
            setPassword(existing.password);
            setNotes(existing.notes ?? "");
          } else {
            setNotFound(true);
          }
        }
      })
      .catch(() => setError("Failed to load vault."));
  }, [vaultKey, id, isNew]);

  // Times the current password was seen in known breaches (null = unknown /
  // not checked). Debounced so a half-typed password isn't looked up.
  const [breachCount, setBreachCount] = useState<number | null>(null);
  useEffect(() => {
    if (!breachAlerts || !password) {
      setBreachCount(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const count = await pwnedCount(password);
        if (!cancelled) setBreachCount(count);
      } catch {
        if (!cancelled) setBreachCount(null); // offline: show nothing
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [password, breachAlerts]);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const strength = passwordStrength(password);
  const strengthColor = [
    colors.border,
    colors.error,
    AMBER,
    YELLOW,
    colors.success,
  ][strength];

  const finish = (message: string) => {
    showSnackbar(message);
    setTimeout(() => router.back(), 700);
  };

  const handleSave = async (skipBreachCheck = false) => {
    setError("");
    if (!entries) {
      return;
    }

    if (!platform || !password) {
      setShowInvalid(true);
      showSnackbar("Choose a platform and enter a password");
      return;
    }

    if (breachAlerts && !skipBreachCheck) {
      setIsSaving(true);
      let count = 0;
      try {
        count = await pwnedCount(password);
      } catch {
        // Offline / service down: never block saving over a failed check.
      }
      setIsSaving(false);
      if (count > 0) {
        setDialog({
          title: "Password found in breaches",
          message: `This password appeared in ${count.toLocaleString()} known data breaches. Attackers try leaked passwords first, so consider choosing a different one.`,
          options: [{ label: "Save anyway", onPress: () => handleSave(true) }],
        });
        return;
      }
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedWebsite = website.trim();
    const trimmedNotes = notes.trim();
    const updated: VaultEntry[] = isNew
      ? [
          ...entries,
          {
            id: Crypto.randomUUID(),
            platform,
            ...(trimmedUsername ? { username: trimmedUsername } : {}),
            ...(trimmedEmail ? { email: trimmedEmail } : {}),
            ...(trimmedPhone ? { phone: trimmedPhone } : {}),
            ...(trimmedWebsite ? { website: trimmedWebsite } : {}),
            password,
            ...(trimmedNotes ? { notes: trimmedNotes } : {}),
          },
        ]
      : entries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                platform,
                username: trimmedUsername || undefined,
                email: trimmedEmail || undefined,
                phone: trimmedPhone || undefined,
                website: trimmedWebsite || undefined,
                password,
                notes: trimmedNotes || undefined,
              }
            : entry,
        );

    setIsSaving(true);
    try {
      await saveEncryptedVault(updated, vaultKey);
      await markPlatformUsed(platform);
      finish(isNew ? "Saved to your vault" : "Changes saved");
    } catch {
      setError("Failed to save entry.");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entries) {
      return;
    }

    setIsDeleting(true);
    try {
      await saveEncryptedVault(
        entries.filter((entry) => entry.id !== id),
        vaultKey,
      );
      finish("Entry deleted");
    } catch {
      setError("Failed to delete entry.");
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    setDialog({
      title: "Delete entry?",
      message: "This will permanently delete the entry.",
      options: [{ label: "Delete", destructive: true, onPress: handleDelete }],
    });
  };

  if (notFound || entries === null) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        {notFound ? (
          <>
            <Text style={[styles.title, { color: colors.text }]}>
              Entry not found
            </Text>
            <NeoBrutalButton label="Back" onPress={() => router.back()} />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </SafeAreaView>
    );
  }

  const busy = isSaving || isDeleting;

  const labelRow = (label: string, hint: string) => (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.hint, { color: colors.subtext }]}>{hint}</Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <BrutalIconButton
            icon="chevron-back"
            label="Back"
            onPress={() => router.back()}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            {isNew ? "Add entry" : "Edit entry"}
          </Text>
        </View>

        <KeyboardScroll
          style={styles.scroll}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {labelRow("Platform", `${platforms.length} available`)}
            <Pressable
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Platform: ${platform || "none selected"}`}
              style={[
                styles.select,
                {
                  borderColor:
                    showInvalid && !platform ? colors.error : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {!!platform && <Monogram name={platform} size={28} />}
              <Text
                style={[
                  styles.selectText,
                  { color: platform ? colors.text : colors.subtext },
                ]}
                numberOfLines={1}
              >
                {platform || "Select a platform"}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View>
            {labelRow("Username", "Optional")}
            <BrutalTextField
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            {labelRow("Email", "Optional")}
            <BrutalTextField
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            {labelRow("Phone", "Optional")}
            <BrutalTextField
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View>
            {labelRow("Website or app", "Optional · for autofill")}
            <BrutalTextField
              value={website}
              onChangeText={setWebsite}
              placeholder="e.g. instagram.com or com.instagram.android"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View>
            {labelRow("Password", "")}
            <BrutalTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              invalid={showInvalid && !password}
              right={
                <View style={styles.passwordActions}>
                  <Pressable
                    onPress={() => {
                      setPassword(generatePassword(Crypto.getRandomBytes));
                      setShowPassword(true);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Generate password"
                  >
                    <Text style={[styles.generate, { color: colors.accent }]}>
                      Generate
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={colors.text}
                    />
                  </Pressable>
                </View>
              }
            />
            {showPassword && (
              <>
                <View style={styles.meter}>
                  {[1, 2, 3, 4].map((segment) => (
                    <View
                      key={segment}
                      style={[
                        styles.segment,
                        {
                          backgroundColor:
                            segment <= strength
                              ? strengthColor
                              : colors.subtext,
                          opacity: segment <= strength ? 1 : 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>
                {strength > 0 && (
                  <Text
                    style={[styles.strengthLabel, { color: colors.subtext }]}
                  >
                    {STRENGTH_LABELS[strength]}
                  </Text>
                )}
              </>
            )}
            {!!breachCount && (
              <View
                accessibilityRole="alert"
                style={[
                  styles.breachAlert,
                  {
                    borderColor: colors.error,
                    backgroundColor: colors.error + "22",
                  },
                ]}
              >
                <Ionicons name="warning" size={20} color={colors.error} />
                <View style={styles.breachBody}>
                  <Text style={[styles.breachTitle, { color: colors.error }]}>
                    Password found in data breaches
                  </Text>
                  <Text style={[styles.breachText, { color: colors.text }]}>
                    This exact password appeared {breachCount.toLocaleString()}{" "}
                    {breachCount === 1 ? "time" : "times"} in leaked databases
                    that attackers use to break into accounts. Anyone using it
                    anywhere is at risk. Change it here and on {platform || "the site"}.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View>
            {labelRow("Notes", "Optional")}
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

          {!!error && (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )}
        </KeyboardScroll>

        <View style={styles.actions}>
          <NeoBrutalButton
            label={
              isSaving ? "Saving..." : isNew ? "Save entry" : "Save changes"
            }
            onPress={() => handleSave()}
            disabled={busy}
          />
          {!isNew && (
            <Pressable
              onPress={confirmDelete}
              disabled={busy}
              accessibilityRole="button"
              style={[
                styles.deleteButton,
                { borderColor: colors.error, opacity: busy ? 0.5 : 1 },
              ]}
            >
              <Text style={[styles.deleteText, { color: colors.error }]}>
                {isDeleting ? "Deleting..." : "Delete entry"}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <PlatformSheet
        visible={sheetOpen}
        selected={platform}
        onClose={() => setSheetOpen(false)}
        onSelect={(name) => {
          setPlatform(name);
          setSheetOpen(false);
        }}
      />

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        options={dialog?.options ?? []}
        onDismiss={closeDialog}
      />

      {snackbar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  scroll: {
    flex: 1,
  },
  form: {
    gap: 14,
    paddingBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  passwordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  generate: {
    fontSize: 13,
    fontWeight: "800",
  },
  meter: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  notes: {
    minHeight: 64,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  breachAlert: {
    flexDirection: "row",
    gap: 10,
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    padding: 12,
    marginTop: 12,
  },
  breachBody: {
    flex: 1,
    gap: 2,
  },
  breachTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  breachText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    paddingBottom: 8,
  },
  deleteButton: {
    borderWidth: BORDER_WIDTH,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 3,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
