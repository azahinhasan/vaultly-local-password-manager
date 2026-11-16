import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import {
  BrutalIconButton,
  SectionLabel,
  ToggleSwitch,
} from "@/components/Brutal";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { PinPromptDialog } from "@/components/PinPromptDialog";
import { BORDER_WIDTH, THEME_OPTIONS } from "@/constants/theme";
import { AUTO_LOCK_OPTIONS, useSecurity } from "@/context/SecurityContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { usePinGate } from "@/hooks/use-pin-gate";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { PIN_EVERY_OPTIONS } from "@/utils/pin-policy";
import {
  exportVaultDecrypted,
  exportVaultEncrypted,
  parseDecryptedImport,
  parseEncryptedImport,
  pickJsonFileContent,
} from "@/utils/vault-export";
import {
  isSameEntry,
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import {
  disableBiometric,
  enableBiometric,
  isBiometricAvailable,
  isBiometricEnabled,
} from "@/utils/biometric";
import {
  autofillAvailable,
  isAutofillEnabled,
  openAutofillSettings,
} from "@/modules/vaultly-autofill";
import { pwnedCount } from "@/utils/breach";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { vaultKey, verifyCurrentPin } = useAuth();
  const {
    autoLock,
    setAutoLock,
    hideInSwitcher,
    setHideInSwitcher,
    pinEveryHours,
    setPinEveryHours,
    breachAlerts,
    setBreachAlerts,
  } = useSecurity();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const colors = useThemeColors();

  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    highlightNote?: string;
    options: AppDialogOption[];
  } | null>(null);
  const closeDialog = () => setDialog(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [pendingImportContent, setPendingImportContent] = useState<
    string | null
  >(null);
  const [importPinError, setImportPinError] = useState("");
  const [isCheckingBreaches, setIsCheckingBreaches] = useState(false);
  const [autofillOn, setAutofillOn] = useState(false);

  // Re-read when returning from Android's autofill settings screen.
  useEffect(() => {
    setAutofillOn(isAutofillEnabled());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setAutofillOn(isAutofillEnabled());
    });
    return () => sub.remove();
  }, []);
  const [pinDialog, askPin] = usePinGate();
  const [erasePinOpen, setErasePinOpen] = useState(false);
  const [erasePinError, setErasePinError] = useState("");

  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  useEffect(() => {
    isBiometricEnabled().then(setBiometricOn);
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const toggleBiometric = async () => {
    if (!vaultKey) return;
    if (!biometricOn && !biometricAvailable) {
      setDialog({
        title: "Biometric unlock",
        message:
          "Set up a fingerprint or face unlock in your phone's settings first.",
        options: [{ label: "OK" }],
      });
      return;
    }
    try {
      if (biometricOn) {
        await disableBiometric();
        setBiometricOn(false);
      } else {
        // Android's secure storage already asks for a fingerprint when saving
        // the protected key, so only confirm separately elsewhere (otherwise
        // it prompts twice).
        if (Platform.OS !== "android") {
          const auth = await LocalAuthentication.authenticateAsync({
            promptMessage: "Confirm to enable biometric unlock",
          });
          if (!auth.success) return;
        }
        await enableBiometric(vaultKey);
        setBiometricOn(true);
      }
    } catch {
      setDialog({
        title: "Biometric lock",
        message: "Could not change biometric lock on this device.",
        options: [{ label: "OK", onPress: closeDialog }],
      });
    }
  };

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

  // The PIN is asked every single time, even right after a fingerprint unlock.
  const confirmThenExport = async (isEncrypted: boolean) => {
    const ok = await askPin({
      title: "Enter your PIN to export",
      message: isEncrypted
        ? "Confirm it's you before exporting an encrypted backup."
        : "Confirm it's you before exporting your passwords in plain text.",
      verify: verifyCurrentPin,
    });
    if (ok) await runExport(isEncrypted);
  };

  const handleExport = () => {
    setDialog({
      title: "Export Vault",
      message:
        "Decrypted exports are plain, readable JSON — anyone with the file can read your passwords.",
      highlightNote:
        "Encrypted exports stay protected, but you'll need to enter the PIN you used to export it when you import this file later — remember that PIN, since there's no way to recover it otherwise.",
      options: [
        { label: "Decrypted", onPress: () => confirmThenExport(false) },
        { label: "Encrypted", onPress: () => confirmThenExport(true) },
      ],
    });
  };

  const finishImport = async (imported: VaultEntry[]) => {
    try {
      const currentEntries = await loadEncryptedVault(vaultKey);
      const newEntries = imported.filter(
        (candidate) =>
          !currentEntries.some((existing) => isSameEntry(existing, candidate)),
      );
      const skipped = imported.length - newEntries.length;

      if (newEntries.length > 0) {
        const updated = [...currentEntries, ...newEntries];
        await saveEncryptedVault(updated, vaultKey);
      }

      const addedMessage = `Added ${newEntries.length} ${newEntries.length === 1 ? "entry" : "entries"}.`;
      setDialog({
        title: newEntries.length > 0 ? "Import complete" : "Nothing new to import",
        message:
          skipped > 0
            ? `${addedMessage} Skipped ${skipped} already in your vault.`
            : addedMessage,
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

  const deleteAllData = async () => {
    try {
      await saveEncryptedVault([], vaultKey);
      setDialog({
        title: "All data deleted",
        message: "Your vault is now empty.",
        options: [{ label: "OK" }],
      });
    } catch (e) {
      setDialog({
        title: "Delete failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        options: [{ label: "OK" }],
      });
    }
  };

  const handleErasePin = async (pin: string) => {
    if (await verifyCurrentPin(pin)) {
      setErasePinOpen(false);
      setErasePinError("");
      await deleteAllData();
    } else {
      setErasePinError("Incorrect PIN.");
    }
  };

  const handleDeleteAllData = () => {
    setDialog({
      title: "Erase vault?",
      message:
        "This permanently deletes every entry in your vault — every saved platform, username, and password. This cannot be undone. You will be asked for your PIN next.",
      options: [
        {
          label: "Erase vault",
          destructive: true,
          onPress: () => setErasePinOpen(true),
        },
      ],
    });
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

  const autoLockLabel = AUTO_LOCK_OPTIONS.find((o) => o.value === autoLock)!
    .label;

  const toggleBreachAlerts = () => {
    if (breachAlerts) {
      setBreachAlerts(false);
      return;
    }
    setDialog({
      title: "Turn on breach alerts?",
      message:
        "Passwords are checked against the Have I Been Pwned database. Your password never leaves this device — only the first 5 characters of its one-way hash are sent over the internet.",
      options: [{ label: "Turn on", onPress: () => setBreachAlerts(true) }],
    });
  };

  const checkVaultForBreaches = async () => {
    setIsCheckingBreaches(true);
    try {
      const entries = await loadEncryptedVault(vaultKey);
      if (entries.length === 0) {
        setDialog({
          title: "Nothing to check",
          message: "Your vault is empty.",
          options: [{ label: "OK" }],
        });
        return;
      }

      const breached: string[] = [];
      for (const entry of entries) {
        if ((await pwnedCount(entry.password)) > 0) {
          breached.push(entry.platform);
        }
      }

      setDialog(
        breached.length === 0
          ? {
              title: "No known breaches",
              message: `None of your ${entries.length} passwords were found in known breaches.`,
              options: [{ label: "OK" }],
            }
          : {
              title: `${breached.length} breached ${breached.length === 1 ? "password" : "passwords"}`,
              message: `Found in known breaches: ${[...new Set(breached)].join(", ")}. Change these passwords.`,
              options: [{ label: "OK" }],
            },
      );
    } catch {
      setDialog({
        title: "Couldn't check",
        message:
          "The breach service couldn't be reached. Check your connection and try again.",
        options: [{ label: "OK" }],
      });
    } finally {
      setIsCheckingBreaches(false);
    }
  };

  const choosePinEvery = () =>
    setDialog({
      title: "Require PIN every",
      message:
        "Biometric unlock works for this long after you last typed your PIN. After that, the PIN is needed once.",
      options: PIN_EVERY_OPTIONS.map((o) => ({
        label: o.label + (o.hours === pinEveryHours ? "  ✓" : ""),
        onPress: () => setPinEveryHours(o.hours),
      })),
    });

  const chooseAutoLock = () =>
    setDialog({
      title: "Auto-lock",
      message: "Require the PIN again after the app has been in the background for:",
      options: AUTO_LOCK_OPTIONS.map((o) => ({
        label: o.label + (o.value === autoLock ? "  ✓" : ""),
        onPress: () => setAutoLock(o.value),
      })),
    });

  const row = (
    icon: React.ComponentProps<typeof Ionicons>["name"],
    label: string,
    onPress: (() => void) | undefined,
    right?: React.ReactNode,
    sub?: string,
  ) => (
    <NeoBrutalCard onPress={onPress}>
      <View style={styles.actionRow}>
        <Ionicons name={icon} size={20} color={colors.text} />
        <View style={styles.rowText}>
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            {label}
          </Text>
          {!!sub && (
            <Text style={[styles.rowSub, { color: colors.subtext }]}>{sub}</Text>
          )}
        </View>
        {right}
      </View>
    </NeoBrutalCard>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <BrutalIconButton
          icon="chevron-back"
          label="Back"
          onPress={() => router.back()}
        />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Appearance</SectionLabel>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map((option) => {
            const isActive = mode === option.mode;
            return (
              <View key={option.mode} style={styles.themeCell}>
                <NeoBrutalCard
                  onPress={() => setMode(option.mode)}
                  backgroundColor={isActive ? colors.highlight : colors.surface}
                  accessibilityLabel={option.label}
                >
                  <View style={styles.themeTile}>
                    <View
                      style={[styles.swatch, { borderColor: colors.border }]}
                    >
                      <View
                        style={[
                          styles.swatchHalf,
                          { backgroundColor: option.preview[0] },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatchHalf,
                          { backgroundColor: option.preview[1] },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.themeLabel,
                        { color: isActive ? colors.highlightText : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isActive && (
                    <View
                      style={[
                        styles.check,
                        { backgroundColor: colors.text, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="checkmark" size={12} color={colors.background} />
                    </View>
                  )}
                </NeoBrutalCard>
              </View>
            );
          })}
        </View>

        <SectionLabel>Security</SectionLabel>
        <View style={styles.actionList}>
          {row("key-outline", "Change PIN", () => router.push("/change-pin"))}
          {row(
            "finger-print",
            "Biometric unlock",
            toggleBiometric,
            <ToggleSwitch
              value={biometricOn}
              onValueChange={toggleBiometric}
              label="Biometric unlock"
            />,
          )}
          {row(
            "keypad-outline",
            "Require PIN every",
            choosePinEvery,
            <Text style={[styles.value, { color: colors.subtext }]}>
              {pinEveryHours} h
            </Text>,
            "Then biometric unlock needs the PIN once",
          )}
          {row(
            "time-outline",
            "Auto-lock",
            chooseAutoLock,
            <Text style={[styles.value, { color: colors.subtext }]}>
              {autoLockLabel}
            </Text>,
            "Lock after leaving the app",
          )}
          {row(
            "shield-outline",
            "Hide in app switcher",
            () => setHideInSwitcher(!hideInSwitcher),
            <ToggleSwitch
              value={hideInSwitcher}
              onValueChange={setHideInSwitcher}
              label="Hide in app switcher"
            />,
          )}
          {autofillAvailable &&
            row(
              "key-outline",
              "Autofill",
              openAutofillSettings,
              <Text style={[styles.value, { color: autofillOn ? colors.success : colors.subtext }]}>
                {autofillOn ? "On" : "Set up"}
              </Text>,
              "Fill logins in Chrome and other apps",
            )}
          {row(
            "alert-circle-outline",
            "Breach alerts",
            toggleBreachAlerts,
            <ToggleSwitch
              value={breachAlerts}
              onValueChange={toggleBreachAlerts}
              label="Breach alerts"
            />,
            "Warn about passwords found in breaches",
          )}
        </View>

        <SectionLabel>Data</SectionLabel>
        <View style={styles.actionList}>
          {row("list-outline", "Manage platforms", () =>
            router.push("/manage-platforms"),
          )}
          {row("download-outline", "Import vault", handleImport)}
          {row("share-outline", "Export vault", handleExport)}
          {row(
            "shield-checkmark-outline",
            isCheckingBreaches ? "Checking..." : "Check vault for breaches",
            isCheckingBreaches ? undefined : checkVaultForBreaches,
            isCheckingBreaches ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : undefined,
          )}
          {row(
            "refresh",
            isCheckingUpdate ? "Checking..." : "Check for updates",
            isCheckingUpdate ? undefined : handleCheckForUpdates,
            isCheckingUpdate ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : undefined,
          )}
        </View>

        <View style={styles.erase}>
          <NeoBrutalCard
            onPress={handleDeleteAllData}
            borderColor={colors.error}
          >
            <View style={styles.actionRow}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.actionLabel, { color: colors.error }]}>
                Erase vault
              </Text>
            </View>
          </NeoBrutalCard>
        </View>

        <Text style={[styles.footer, { color: colors.subtext }]}>
          Everything stays on this device
        </Text>
      </ScrollView>

      {pinDialog}

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        highlightNote={dialog?.highlightNote}
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

      <PinPromptDialog
        visible={erasePinOpen}
        title="Enter your PIN"
        message="Confirm your PIN to erase the vault."
        error={erasePinError}
        onSubmit={handleErasePin}
        onCancel={() => {
          setErasePinOpen(false);
          setErasePinError("");
        }}
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
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  content: {
    padding: 16,
    gap: 10,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeCell: {
    width: "48%",
    flexGrow: 1,
  },
  themeTile: {
    padding: 12,
    gap: 10,
  },
  swatch: {
    flexDirection: "row",
    height: 26,
    borderWidth: BORDER_WIDTH,
    borderRadius: 8,
    overflow: "hidden",
  },
  swatchHalf: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: BORDER_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  actionList: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  rowSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  value: {
    fontSize: 13,
    fontWeight: "800",
  },
  erase: {
    marginTop: 18,
  },
  footer: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
});
