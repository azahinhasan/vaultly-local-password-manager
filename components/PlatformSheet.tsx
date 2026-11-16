import {
  BrutalChip,
  BrutalIconButton,
  BrutalTextField,
  Monogram,
} from "@/components/Brutal";
import {
  MAX_PLATFORM_NAME_LENGTH,
  OTHER_CATEGORY,
  PlatformEntry,
} from "@/constants/platforms";
import { BORDER_WIDTH } from "@/constants/theme";
import { usePlatforms } from "@/context/PlatformsContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { groupByCategory, recentPlatforms } from "@/utils/vault-filter";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface PlatformSheetProps {
  visible: boolean;
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function PlatformSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: PlatformSheetProps) {
  const colors = useThemeColors();
  const { platforms, addPlatform } = usePlatforms();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setError("");
    }
  }, [visible]);

  const q = query.trim();
  const sections = useMemo(() => groupByCategory(platforms), [platforms]);
  const recents = useMemo(() => recentPlatforms(platforms), [platforms]);
  const matches = useMemo(
    () =>
      q
        ? platforms
            .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [platforms, q],
  );
  const exact = platforms.some((p) => p.name.toLowerCase() === q.toLowerCase());

  const createCustom = async () => {
    const result = await addPlatform(q, OTHER_CATEGORY);
    if (result.success) {
      onSelect(q);
    } else {
      setError(result.error ?? "Could not add platform.");
    }
  };

  const row = (p: PlatformEntry, showCategory: boolean) => (
    <Pressable
      onPress={() => onSelect(p.name)}
      accessibilityRole="button"
      accessibilityState={{ selected: p.name === selected }}
      style={styles.row}
    >
      <Monogram name={p.name} color={p.color} size={34} />
      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
        {p.name}
      </Text>
      {showCategory && (
        <Text style={[styles.rowCategory, { color: colors.subtext }]}>
          {p.category}
        </Text>
      )}
      {p.name === selected && (
        <Ionicons name="checkmark" size={22} color={colors.accent} />
      )}
    </Pressable>
  );

  const createRow =
    q && !exact ? (
      <View>
        <Pressable onPress={createCustom} style={styles.row}>
          <View
            style={[
              styles.plus,
              { borderColor: colors.border, backgroundColor: colors.highlight },
            ]}
          >
            <Ionicons name="add" size={20} color={colors.highlightText} />
          </View>
          <Text style={[styles.rowName, { color: colors.text }]}>
            Use &quot;{q}&quot; as a new platform
          </Text>
        </Pressable>
        {q.length > MAX_PLATFORM_NAME_LENGTH && !error && (
          <Text style={[styles.error, { color: colors.error }]}>
            Platform name must be {MAX_PLATFORM_NAME_LENGTH} characters or fewer.
          </Text>
        )}
        {!!error && (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        )}
      </View>
    ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.subtext }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Choose platform
            </Text>
            <BrutalIconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <BrutalTextField
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setError("");
            }}
            placeholder="Search or type a new one"
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel="Search platforms"
            containerStyle={styles.search}
            left={
              <Ionicons
                name="search"
                size={18}
                color={colors.subtext}
                style={styles.searchIcon}
              />
            }
          />

          {q ? (
            <FlatList
              data={matches}
              keyExtractor={(p) => p.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => row(item, true)}
              ListFooterComponent={createRow}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(p) => p.name}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled
              renderItem={({ item }) => row(item, false)}
              renderSectionHeader={({ section }) => (
                <View
                  style={[
                    styles.sectionHeader,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                    {section.title}
                  </Text>
                  <Text style={[styles.sectionCount, { color: colors.subtext }]}>
                    {section.data.length}
                  </Text>
                </View>
              )}
              ListHeaderComponent={
                recents.length > 0 ? (
                  <View style={styles.recents}>
                    <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
                      Recently used
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.chips}
                    >
                      {recents.map((p) => (
                        <BrutalChip
                          key={p.name}
                          label={p.name}
                          selected={p.name === selected}
                          onPress={() => onSelect(p.name)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    height: "80%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: BORDER_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
  },
  search: {
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  listContent: {
    paddingBottom: 32,
  },
  recents: {
    gap: 8,
    paddingVertical: 8,
  },
  chips: {
    gap: 8,
    paddingRight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 6,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  rowCategory: {
    fontSize: 13,
    fontWeight: "600",
  },
  plus: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: BORDER_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 46,
  },
});
