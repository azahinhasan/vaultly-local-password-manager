import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { PinPromptDialog } from "@/components/PinPromptDialog";
import { BORDER_WIDTH, THEME_OPTIONS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  exportVaultDecrypted,
  exportVaultEncrypted,
  parseDecryptedImport,
  parseEncryptedImport,
  pickJsonFileContent,
} from "@/utils/vault-export";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import * as Updates from "expo-updates";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { vaultKey } = useAuth();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const colors = useThemeColors();

  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    options: AppDialogOption[];
  } | null>(null);
  const closeDialog = () => setDialog(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [pendingImportContent, setPendingImportContent] = useState<
    string | null
  >(null);
  const [importPinError, setImportPinError] = useState("");

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const runExport = async (isEncrypted: boolean) => {
    try {
      const entries = await loadEncryptedVault(vaultKey);
      if (entries.length === 0) {
        setDialog({
          title: "Nothing to export",
          message: "Your vault is empty.",
          options: [{ label: "OK" }],
        });
        return;
      }

      if (isEncrypted) {
        await exportVaultEncrypted(entries, vaultKey);
      } else {
        await exportVaultDecrypted(entries);
      }
    } catch (e) {
      setDialog({
        title: "Export failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
    }
  };

  const handleExport = () => {
    setDialog({
      title: "Export Vault",
      message:
        "Decrypted exports are plain, readable JSON — anyone with the file can read your passwords. Encrypted exports stay protected, but you'll need to enter the PIN you used to export it when you import this file later — remember that PIN, since there's no way to recover it otherwise.",
      options: [
        { label: "Decrypted", onPress: () => runExport(false) },
        { label: "Encrypted", onPress: () => runExport(true) },
      ],
    });
  };

  const finishImport = async (imported: VaultEntry[]) => {
    try {
      const currentEntries = await loadEncryptedVault(vaultKey);
      const updated = [...currentEntries, ...imported];
      await saveEncryptedVault(updated, vaultKey);

      setDialog({
        title: "Import complete",
        message: `Added ${imported.length} ${imported.length === 1 ? "entry" : "entries"}.`,
        options: [{ label: "OK" }],
      });
    } catch (e) {
      setDialog({
        title: "Import failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
    }
  };

  const runImport = async (isEncrypted: boolean) => {
    try {
      const content = await pickJsonFileContent();
      if (content === null) {
        return;
      }

      if (isEncrypted) {
        // Encrypted exports are only decryptable with the PIN they were
        // exported under — that may not be this installation's current PIN
        // (e.g. after an uninstall/reinstall, which resets the local salt).
        setPendingImportContent(content);
        return;
      }

      await finishImport(parseDecryptedImport(content));
    } catch (e) {
      setDialog({
        title: "Import failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
    }
  };

  const handleImport = () => {
    setDialog({
      title: "Import Vault",
      message: "What format is the JSON file you're importing?",
      options: [
        { label: "Decrypted", onPress: () => runImport(false) },
        { label: "Encrypted", onPress: () => runImport(true) },
      ],
    });
  };

  const handleImportPinSubmit = async (pin: string) => {
    if (!pendingImportContent) {
      return;
    }

    try {
      const imported = await parseEncryptedImport(pendingImportContent, pin);
      setPendingImportContent(null);
      setImportPinError("");
      await finishImport(imported);
    } catch (e) {
      setImportPinError(
        e instanceof Error ? e.message : "Something went wrong.",
      );
    }
  };

  const cancelImportPin = () => {
    setPendingImportContent(null);
    setImportPinError("");
  };

  const downloadAndApplyUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      setDialog({
        title: "Update failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
      setIsCheckingUpdate(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if (!Updates.isEnabled) {
      setDialog({
        title: "Updates unavailable",
        message:
          "This build doesn't support checking for updates (e.g. Expo Go, or a build without EAS Update configured).",
        options: [{ label: "OK" }],
      });
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      setIsCheckingUpdate(false);

      if (!result.isAvailable) {
        setDialog({
          title: "Up to date",
          message: "You're already on the latest version.",
          options: [{ label: "OK" }],
        });
        return;
      }

      setDialog({
        title: "Update available",
        message: "A new version is ready. Download and restart now?",
        options: [
          { label: "Download & Restart", onPress: downloadAndApplyUpdate },
        ],
      });
    } catch (e) {
      setIsCheckingUpdate(false);
      setDialog({
        title: "Update check failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        <View style={styles.themeList}>
          {THEME_OPTIONS.map((option) => {
            const isActive = mode === option.mode;
            return (
              <NeoBrutalCard
                key={option.mode}
                onPress={() => setMode(option.mode)}
                backgroundColor={isActive ? colors.highlight : colors.surface}
              >
                <View style={styles.themeRow}>
                  <View style={styles.previewSwatches}>
                    <View
                      style={[
                        styles.previewSwatch,
                        {
                          backgroundColor: option.preview.background,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.previewSwatch,
                        styles.previewSwatchOverlap,
                        {
                          backgroundColor: option.preview.accent,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.themeTextGroup}>
                    <Text
                      style={[
                        styles.themeLabel,
                        {
                          color: isActive ? colors.highlightText : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.themeDescription,
                        {
                          color: isActive
                            ? colors.highlightText
                            : colors.subtext,
                        },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={26}
                      color={colors.highlightText}
                    />
                  )}
                </View>
              </NeoBrutalCard>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Vault
        </Text>
        <View style={styles.actionList}>
          <NeoBrutalCard onPress={() => router.push("/change-pin")}>
            <View style={styles.actionRow}>
              <Ionicons name="key" size={20} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Change PIN
              </Text>
            </View>
          </NeoBrutalCard>
          <NeoBrutalCard onPress={handleImport}>
            <View style={styles.actionRow}>
              <Ionicons name="download" size={20} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Import Vault
              </Text>
            </View>
          </NeoBrutalCard>
          <NeoBrutalCard onPress={handleExport}>
            <View style={styles.actionRow}>
              <Ionicons name="share" size={20} color={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Export Vault
              </Text>
            </View>
          </NeoBrutalCard>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>App</Text>
        <View style={styles.actionList}>
          <NeoBrutalCard
            onPress={isCheckingUpdate ? undefined : handleCheckForUpdates}
          >
            <View style={styles.actionRow}>
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="refresh" size={24} color={colors.text} />
              )}
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {isCheckingUpdate ? "Checking..." : "Check for Updates"}
              </Text>
            </View>
          </NeoBrutalCard>
        </View>
      </ScrollView>

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        options={dialog?.options ?? []}
        onDismiss={closeDialog}
      />

      <PinPromptDialog
        visible={pendingImportContent !== null}
        title="Enter export PIN"
        message="This backup is encrypted. Enter the PIN it was exported with."
        error={importPinError}
        onSubmit={handleImportPinSubmit}
        onCancel={cancelImportPin}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSpacer: {
    width: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  content: {
    padding: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  themeList: {
    gap: 14,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  previewSwatches: {
    flexDirection: "row",
    width: 44,
  },
  previewSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: BORDER_WIDTH,
  },
  previewSwatchOverlap: {
    marginLeft: -12,
  },
  themeTextGroup: {
    flex: 1,
    gap: 2,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  themeDescription: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionList: {
    gap: 14,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
});
