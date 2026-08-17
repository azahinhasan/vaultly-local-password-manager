import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";

interface PlatformSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function PlatformSelect({
  value,
  onChange,
  options,
  placeholder = "Select a platform",
}: PlatformSelectProps) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Text
          style={[
            styles.fieldText,
            { color: value ? colors.text : colors.subtext },
          ]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <NeoBrutalCard style={styles.sheetSurface}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              ItemSeparatorComponent={() => (
                <View
                  style={[styles.separator, { backgroundColor: colors.border }]}
                />
              )}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={20} color={colors.accent} />
                  )}
                </Pressable>
              )}
            />
          </NeoBrutalCard>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldText: {
    fontSize: 16,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 32,
  },
  sheetSurface: {
    maxHeight: 320,
  },
  separator: {
    height: BORDER_WIDTH,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
