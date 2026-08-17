import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { PlatformSelect } from "@/components/PlatformSelect";
import { PLATFORMS } from "@/constants/platforms";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
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
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EntryFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaultKey } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const isNew = id === "new";

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [platform, setPlatform] = useState("");
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
            setIsCustomPlatform(!PLATFORMS.includes(existing.platform));
            setColor(existing.color);
            setUsername(existing.username);
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

  const handleSave = async () => {
    if (!entries) {
      return;
    }

    if (!platform || !username.trim() || !password) {
      setError("Platform, username, and password are required.");
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
            username: username.trim(),
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
                username: username.trim(),
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

        <View style={styles.form}>
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
                options={PLATFORMS}
              />
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>
              Username
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
              placeholder="Username or Email"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.text }]}>
              Password
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
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
            />
          </View>

          {!!error && (
            <Text style={[styles.error, { color: colors.error }]}>
              {error}
            </Text>
          )}

          <NeoBrutalButton
            label={isSaving ? "Saving..." : "Save"}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.saveButton}
          />
        </View>
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
  form: {
    gap: 18,
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
