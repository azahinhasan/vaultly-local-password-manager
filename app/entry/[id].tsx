import { PlatformSelect } from "@/components/PlatformSelect";
import { PLATFORMS } from "@/constants/platforms";
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
    const updated: VaultEntry[] = isNew
      ? [
          ...entries,
          {
            id: Crypto.randomUUID(),
            platform,
            username: username.trim(),
            password,
            ...(trimmedNotes ? { notes: trimmedNotes } : {}),
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
              <Text style={[styles.label, { color: colors.subtext }]}>
                Platform
              </Text>
              <Pressable
                onPress={() => {
                  setIsCustomPlatform((v) => !v);
                  setPlatform("");
                }}
              >
                <Text style={[styles.link, { color: colors.accent }]}>
                  {isCustomPlatform ? "Choose from list" : "Enter manually"}
                </Text>
              </Pressable>
            </View>
            {isCustomPlatform ? (
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={platform}
                onChangeText={setPlatform}
                placeholder="e.g. Steam"
                placeholderTextColor={colors.subtext}
                autoCapitalize="words"
              />
            ) : (
              <PlatformSelect
                value={platform}
                onChange={setPlatform}
                options={PLATFORMS}
              />
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>
              Username
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="Username or Email"
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>
              Password
            </Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  { color: colors.text, borderColor: colors.border },
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
                  color={colors.subtext}
                />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                { color: colors.text, borderColor: colors.border },
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
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent, opacity: isSaving ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
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
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  platformHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
  },
  notesInput: {
    minHeight: 80,
  },
  error: {
    fontSize: 13,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
