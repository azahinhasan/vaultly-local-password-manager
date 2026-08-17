import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { PlatformSelect } from "@/components/PlatformSelect";
import { getPlatformColor, PLATFORMS } from "@/constants/platforms";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import {
  loadEncryptedVault,
  saveEncryptedVault,
  VaultEntry,
} from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ALL_PLATFORMS_OPTION = "All";
const OTHER_PLATFORMS_OPTION = "Other";
const FILTER_OPTIONS = [
  ALL_PLATFORMS_OPTION,
  ...PLATFORMS,
  OTHER_PLATFORMS_OPTION,
];

export default function VaultScreen() {
  const { vaultKey } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();

  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    options: AppDialogOption[];
  } | null>(null);
  const closeDialog = () => setDialog(null);

  useFocusEffect(
    useCallback(() => {
      if (!vaultKey) {
        return;
      }

      loadEncryptedVault(vaultKey)
        .then(setEntries)
        .catch(() => setError("Failed to decrypt vault."));
    }, [vaultKey]),
  );

  const filteredEntries = useMemo(() => {
    if (!entries) {
      return entries;
    }
    if (!platformFilter) {
      return entries;
    }
    if (platformFilter === OTHER_PLATFORMS_OPTION) {
      return entries.filter((entry) => !PLATFORMS.includes(entry.platform));
    }
    return entries.filter((entry) => entry.platform === platformFilter);
  }, [entries, platformFilter]);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openEntry = (id: string) => {
    router.push({ pathname: "/entry/[id]", params: { id } });
  };

  const confirmDelete = (entry: VaultEntry) => {
    setDialog({
      title: "Delete entry?",
      message: `This will permanently delete the entry.`,
      options: [
        {
          label: "Delete",
          destructive: true,
          onPress: () => deleteEntry(entry.id),
        },
      ],
    });
  };

  const deleteEntry = async (id: string) => {
    if (!entries) {
      return;
    }

    const updated = entries.filter((entry) => entry.id !== id);

    try {
      await saveEncryptedVault(updated, vaultKey);
      setEntries(updated);
    } catch {
      setError("Failed to delete entry.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Your Vault</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/entry/[id]", params: { id: "new" } })
            }
            hitSlop={12}
          >
            <Ionicons name="add-circle" size={32} color={colors.accent} />
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
            <Ionicons name="settings" size={26} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {entries !== null && entries.length > 0 && (
        <PlatformSelect
          value={platformFilter ?? ALL_PLATFORMS_OPTION}
          onChange={(value) =>
            setPlatformFilter(value === ALL_PLATFORMS_OPTION ? null : value)
          }
          options={FILTER_OPTIONS}
        />
      )}

      {error ? (
        <Text style={[styles.message, { color: colors.error }]}>{error}</Text>
      ) : entries === null ? (
        <ActivityIndicator style={styles.message} color={colors.accent} />
      ) : entries.length === 0 ? (
        <Text style={[styles.message, { color: colors.subtext }]}>
          No entries yet
        </Text>
      ) : filteredEntries && filteredEntries.length === 0 ? (
        <Text style={[styles.message, { color: colors.subtext }]}>
          No entries for {platformFilter}
        </Text>
      ) : (
        <FlatList
          data={filteredEntries ?? []}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NeoBrutalCard
              onPress={() => openEntry(item.id)}
              onLongPress={() => confirmDelete(item)}
            >
              <View style={styles.cardInner}>
                <View style={styles.cardText}>
                  <View style={styles.platformRow}>
                    <View
                      style={[
                        styles.colorDot,
                        {
                          backgroundColor: getPlatformColor(
                            item.platform,
                            item.color,
                          ),
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.platform,
                        {
                          color: getPlatformColor(item.platform, item.color),
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.platform}
                    </Text>
                  </View>
                  <Text
                    style={[styles.username, { color: colors.subtext }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.username}
                  </Text>
                  <Text
                    style={[styles.password, { color: colors.subtext }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {revealed[item.id] ? item.password : "••••••••"}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleReveal(item.id);
                  }}
                  hitSlop={12}
                  style={styles.toggle}
                >
                  <Ionicons
                    name={revealed[item.id] ? "eye-off" : "eye"}
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
              </View>
            </NeoBrutalCard>
          )}
        />
      )}

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
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  message: {
    marginTop: 24,
    textAlign: "center",
    fontWeight: "700",
  },
  list: {
    gap: 16,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  platform: {
    fontSize: 17,
    fontWeight: "800",
    flexShrink: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
  },
  password: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  toggle: {
    paddingLeft: 12,
  },
});
