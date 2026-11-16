import {
  BrutalChip,
  BrutalIconButton,
  BrutalTextField,
  Monogram,
  useSnackbar,
} from "@/components/Brutal";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useSecurity } from "@/context/SecurityContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { pwnedCount } from "@/utils/breach";
import { filterEntries, usedCategories } from "@/utils/vault-filter";
import { loadEncryptedVault, VaultEntry } from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const REVEAL_MS = 15_000;
const CLIPBOARD_CLEAR_MS = 30_000;

// Module-level so the clear still fires after leaving this screen.
let clipboardTimer: ReturnType<typeof setTimeout> | undefined;

export default function VaultScreen() {
  const { vaultKey, lock } = useAuth();
  const { platforms } = usePlatforms();
  const router = useRouter();
  const colors = useThemeColors();
  const [snackbar, showSnackbar] = useSnackbar();
  const { breachAlerts } = useSecurity();

  // Passwords found in known breaches. Keyed by the password itself (not the
  // entry), so editing an entry's password can't leave an old warning behind.
  const [breached, setBreached] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<VaultEntry[] | null>(null);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const revealTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!vaultKey) {
        return;
      }

      loadEncryptedVault(vaultKey)
        .then(setEntries)
        .catch(() => setError("Failed to decrypt vault."));

      // Leaving the screen hides every revealed password again.
      return () => {
        Object.values(revealTimers.current).forEach(clearTimeout);
        revealTimers.current = {};
        setRevealed({});
      };
    }, [vaultKey]),
  );

  const categories = useMemo(
    () => usedCategories(entries ?? [], platforms),
    [entries, platforms],
  );
  const activeCategory =
    category && categories.includes(category) ? category : null;
  const visible = useMemo(
    () => filterEntries(entries ?? [], query, activeCategory, platforms),
    [entries, query, activeCategory, platforms],
  );

  // Opt-in breach check, one entry at a time. A failed lookup (offline) just
  // leaves that entry unmarked; results are cached per session in breach.ts.
  useEffect(() => {
    if (!breachAlerts || !entries) {
      setBreached(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      for (const entry of entries) {
        try {
          const count = await pwnedCount(entry.password);
          if (cancelled) return;
          if (count > 0) setBreached((prev) => new Set(prev).add(entry.password));
        } catch {
          return; // service unreachable: stop quietly, retry next time
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [breachAlerts, entries]);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const toggleReveal = (id: string) => {
    clearTimeout(revealTimers.current[id]);
    const next = !revealed[id];
    setRevealed((prev) => ({ ...prev, [id]: next }));
    if (next) {
      revealTimers.current[id] = setTimeout(
        () => setRevealed((prev) => ({ ...prev, [id]: false })),
        REVEAL_MS,
      );
    }
  };

  const copyPassword = async (password: string) => {
    await Clipboard.setStringAsync(password);
    showSnackbar("Password copied · clears in 30 s");
    clearTimeout(clipboardTimer);
    clipboardTimer = setTimeout(async () => {
      // Only clear if the clipboard still holds our value.
      if ((await Clipboard.getStringAsync()) === password) {
        await Clipboard.setStringAsync("");
      }
    }, CLIPBOARD_CLEAR_MS);
  };

  const openEntry = (id: string) => {
    router.push({ pathname: "/entry/[id]", params: { id } });
  };

  const count = entries?.length ?? 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Your Vault</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            {count} {count === 1 ? "item" : "items"} · on this device
          </Text>
        </View>
        <View style={styles.headerActions}>
          <BrutalIconButton icon="lock-closed" label="Lock now" onPress={lock} />
          <BrutalIconButton
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>

      <BrutalTextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search vault"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search vault"
        left={
          <Ionicons
            name="search"
            size={18}
            color={colors.subtext}
            style={styles.searchIcon}
          />
        }
      />

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <BrutalChip
            label="All"
            selected={!activeCategory}
            onPress={() => setCategory(null)}
          />
          {categories.map((c) => (
            <BrutalChip
              key={c}
              label={c}
              selected={activeCategory === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      </View>

      {error ? (
        <Text style={[styles.message, { color: colors.error }]}>{error}</Text>
      ) : entries === null ? (
        <ActivityIndicator style={styles.message} color={colors.accent} />
      ) : visible.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.subtext }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nothing here yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.subtext }]}>
            Add a login to see it in this list.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const platformColor = platforms.find(
              (p) => p.name === item.platform,
            )?.color;
            const isRevealed = !!revealed[item.id];
            const isBreached = breached.has(item.password);
            return (
              <NeoBrutalCard onPress={() => openEntry(item.id)}>
                <View style={styles.cardInner}>
                  <Monogram
                    name={item.platform}
                    color={platformColor}
                    borderColor={isBreached ? colors.error : undefined}
                  />
                  <View style={styles.cardText}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.platform, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.platform}
                      </Text>
                      {isBreached && (
                        <Ionicons
                          name="warning"
                          size={17}
                          color={colors.error}
                          accessibilityLabel="Password found in a data breach. Open to see details."
                        />
                      )}
                    </View>
                    <Text
                      style={[styles.username, { color: colors.subtext }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.username || item.email || item.phone || "No username"}
                    </Text>
                    <Text
                      style={[styles.password, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {isRevealed ? item.password : "••••••••••"}
                    </Text>
                  </View>
                  <BrutalIconButton
                    icon={isRevealed ? "eye-off-outline" : "eye-outline"}
                    label={isRevealed ? "Hide password" : "Show password"}
                    onPress={() => toggleReveal(item.id)}
                  />
                  <BrutalIconButton
                    icon="copy-outline"
                    label="Copy password"
                    onPress={() => copyPassword(item.password)}
                  />
                </View>
              </NeoBrutalCard>
            );
          }}
        />
      )}

      <View style={styles.fab}>
        <NeoBrutalCard
          radius={16}
          offset={4}
          backgroundColor={colors.accent}
          accessibilityLabel="Add entry"
          onPress={() =>
            router.push({ pathname: "/entry/[id]", params: { id: "new" } })
          }
          style={styles.fabInner}
        >
          <Ionicons name="add" size={22} color={colors.accentText} />
          <Text style={[styles.fabText, { color: colors.accentText }]}>Add</Text>
        </NeoBrutalCard>
      </View>

      {snackbar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flexShrink: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchIcon: {
    marginRight: 10,
  },
  chips: {
    gap: 8,
    paddingRight: 16,
  },
  message: {
    marginTop: 24,
    textAlign: "center",
    fontWeight: "700",
  },
  empty: {
    borderWidth: BORDER_WIDTH,
    borderStyle: "dashed",
    borderRadius: RADIUS,
    padding: 28,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  emptyBody: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // Bottom padding keeps the FAB from covering the last card.
  list: {
    gap: 14,
    paddingBottom: 110,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  platform: {
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: "600",
  },
  password: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
  },
  fabInner: {
    height: 54,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fabText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
