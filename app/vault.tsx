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
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
    Alert.alert(
      "Delete entry?",
      `This will permanently delete "${entry.platform}".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteEntry(entry.id),
        },
      ],
    );
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
        <Pressable
          onPress={() =>
            router.push({ pathname: "/entry/[id]", params: { id: "new" } })
          }
          hitSlop={12}
        >
          <Ionicons name="add-circle" size={30} color={colors.accent} />
        </Pressable>
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
            <Pressable
              onPress={() => openEntry(item.id)}
              onLongPress={() => confirmDelete(item)}
              style={[styles.card, { backgroundColor: colors.card }]}
            >
              <View style={styles.cardText}>
                <Text style={[styles.platform, { color: colors.text }]}>
                  {item.platform}
                </Text>
                <Text style={[styles.username, { color: colors.subtext }]}>
                  {item.username}
                </Text>
                <Text style={[styles.password, { color: colors.subtext }]}>
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
                  color={colors.subtext}
                />
              </Pressable>
            </Pressable>
          )}
        />
      )}
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
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  message: {
    marginTop: 24,
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 16,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  platform: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 13,
  },
  password: {
    fontSize: 13,
    letterSpacing: 1,
  },
  toggle: {
    paddingLeft: 12,
  },
});
