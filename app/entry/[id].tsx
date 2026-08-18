import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { PlatformSelect } from "@/components/PlatformSelect";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EntryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaultKey } = useAuth();
  const { platforms } = usePlatforms();
  const router = useRouter();
  const colors = useThemeColors();

  const isNew = id === "new";
  const platformNames = useMemo(
    () => platforms.map((p) => p.name),
    [platforms],
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const notesInputRef = useRef<TextInput>(null);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [platform, setPlatform] = useState("");
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "password" | "notes" | null
  >(null);
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
    // scrollTo/scrollToEnd don't expose a duration — driving the offset
    // through an Animated.Value ourselves is the only way to get a
    // deliberately smooth (not instant-feeling) scroll.
    const id = scrollAnim.addListener(({ value }) => {
      scrollViewRef.current?.scrollTo({ y: value, animated: false });
    });
    return () => scrollAnim.removeListener(id);
  }, [scrollAnim]);

  const focusLowerField = (field: "password" | "notes") => {
    setFocusedField(field);
    // Wait a tick so the extra bottom padding (which only applies once
    // focusedField is set) has actually taken effect — otherwise there's
    // not yet enough scrollable content to smooth-scroll into.
    setTimeout(() => {
      const target = Math.max(
        0,
        contentHeight.current - viewportHeight.current,
      );
      scrollAnim.setValue(scrollOffset.current);
      Animated.timing(scrollAnim, {
        toValue: target,
        duration: 350,
        useNativeDriver: false,
      }).start();
    }, 50);
  };

  useEffect(() => {
    // Android can hide the keyboard (back button, the keyboard's own
    // dismiss chevron, swipe-down) without actually blurring the native
    // TextInput underneath — the field stays natively "focused" even
    // though the keyboard is gone. If we only reset our own JS state here,
    // tapping that same field again isn't a real focus transition (it
    // never blurred), so onFocus never fires a second time. Explicitly
    // blurring both refs keeps native focus state in sync with what the
    // user actually sees, so the next tap always fires onFocus again.
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setFocusedField(null);
      passwordInputRef.current?.blur();
      notesInputRef.current?.blur();
    });
    return () => hideSub.remove();
  }, []);

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
            setIsCustomPlatform(!platformNames.includes(existing.platform));
            setColor(existing.color);
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
    // Only re-run when the id being edited changes, not every time the
    // managed platforms list changes (that would clobber in-progress edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultKey, id, isNew]);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const handleSave = async () => {
    setFocusedField(null);

    if (!entries) {
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!platform || !password || (!trimmedUsername && !trimmedEmail)) {
      setError(
        "Platform, password, and at least a username or email are required.",
      );
      return;
    }

    setError("");
    setIsSaving(true);

    const trimmedNotes = notes.trim();
    const entryColor = isCustomPlatform ? color : undefined;
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
            ...(entryColor ? { color: entryColor } : {}),
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
                color: entryColor,
              }
            : entry,
        );

    try {
      await saveEncryptedVault(updated, vaultKey);
      router.back();
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
    const updated = entries.filter((entry) => entry.id !== id);

    try {
      await saveEncryptedVault(updated, vaultKey);
      router.back();
    } catch {
      setError("Failed to delete entry.");
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    setDialog({
      title: "Delete entry?",
      message: `This will permanently delete the entry.`,
      options: [{ label: "Delete", destructive: true, onPress: handleDelete }],
    });
  };

  if (notFound) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Entry not found
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.cancelText, { color: colors.accent }]}>
            Go back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (entries === null) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

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
          {isNew ? "Add Entry" : "Edit Entry"}
        </Text>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.form,
            focusedField && styles.formWithKeyboardSpace,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollOffset.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={(_width, height) => {
            contentHeight.current = height;
          }}
          onLayout={(e) => {
            viewportHeight.current = e.nativeEvent.layout.height;
          }}
        >
          <View>
            <View style={styles.platformHeader}>
              <Text style={[styles.label, { color: colors.text }]}>
                Platform
              </Text>
              <Pressable
                onPress={() => {
                  setIsCustomPlatform((v) => !v);
                  setPlatform("");
                  setColor(undefined);
                }}
              >
                <Text style={[styles.link, { color: colors.accent }]}>
                  {isCustomPlatform ? "Choose from list" : "Enter manually"}
                </Text>
              </Pressable>
            </View>
            {isCustomPlatform ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={platform}
                  onChangeText={setPlatform}
                  placeholder="e.g. Steam"
                  placeholderTextColor={colors.subtext}
                  autoCapitalize="words"
                />
                <Text
                  style={[
                    styles.label,
                    styles.colorLabel,
                    { color: colors.text },
                  ]}
                >
                  Color (optional)
                </Text>
                <ColorSwatchPicker value={color} onChange={setColor} />
              </>
            ) : (
              <PlatformSelect
                value={platform}
                onChange={setPlatform}
                options={platformNames}
              />
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>
              Username (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>
              Email (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                ref={passwordInputRef}
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.subtext}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onFocus={() => focusLowerField("password")}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => setFocusedField(null)}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={12}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>
              Notes (optional)
            </Text>
            <TextInput
              ref={notesInputRef}
              style={[
                styles.input,
                styles.notesInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any extra details"
              placeholderTextColor={colors.subtext}
              multiline
              textAlignVertical="top"
              onFocus={() => focusLowerField("notes")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {!!error && (
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )}

          <NeoBrutalButton
            label={isSaving ? "Saving..." : "Save"}
            onPress={handleSave}
            disabled={isSaving || isDeleting}
            color="#2847b8"
            textColor="#FFFFFF"
            style={styles.saveButton}
          />

          {!isNew && (
            <NeoBrutalButton
              label={isDeleting ? "Deleting..." : "Delete"}
              onPress={confirmDelete}
              disabled={isSaving || isDeleting}
              variant="error"
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        options={dialog?.options ?? []}
        onDismiss={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    alignSelf: "flex-start",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    gap: 18,
    paddingBottom: 24,
  },
  // Extra scroll room reserved only while the Password or Notes field is
  // focused — those sit closest to the keyboard, and without this there's
  // not enough content below them for the ScrollView to scroll into.
  formWithKeyboardSpace: {
    paddingBottom: Platform.OS === "android" ? 260 : 200,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  colorLabel: {
    marginTop: 14,
  },
  platformHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  link: {
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
  },
  notesInput: {
    minHeight: 80,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  saveButton: {
    marginTop: 8,
  },
});
