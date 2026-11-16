import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import {
  BrutalIconButton,
  BrutalTextField,
  Monogram,
  useSnackbar,
} from "@/components/Brutal";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { PlatformSheet } from "@/components/PlatformSheet";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
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
  ScrollView,
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

  const isNew = id === "new";

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
            setPassword(existing.password);
            setNotes(existing.notes ?? "");
          } else {
            setNotFound(true);
          }
        }
      })
      .catch(() => setError("Failed to load vault."));
  }, [vaultKey, id, isNew]);

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

  const handleSave = async () => {
    setError("");
    if (!entries) {
      return;
    }

    if (!platform || !password) {
      setShowInvalid(true);
      showSnackbar("Choose a platform and enter a password");
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedNotes = notes.trim();
    const updated: VaultEntry[] = isNew
      ? [
          ...entries,
          {
            id: Crypto.randomUUID(),
            platform,
            ...(trimmedUsername ? { username: trimmedUsername } : {}),
            ...(trimmedEmail ? { email: trimmedEmail } : {}),
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
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
            <View style={styles.meter}>
              {[1, 2, 3, 4].map((segment) => (
                <View
                  key={segment}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        segment <= strength ? strengthColor : colors.subtext,
                      opacity: segment <= strength ? 1 : 0.3,
                    },
                  ]}
                />
              ))}
            </View>
            {strength > 0 && (
              <Text style={[styles.strengthLabel, { color: colors.subtext }]}>
                {STRENGTH_LABELS[strength]}
              </Text>
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
        </ScrollView>

        <View style={styles.actions}>
          <NeoBrutalButton
            label={
              isSaving ? "Saving..." : isNew ? "Save entry" : "Save changes"
            }
            onPress={handleSave}
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
    paddingHorizontal: 24,
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
