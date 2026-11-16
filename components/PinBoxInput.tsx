import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface PinBoxInputProps {
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Kept for caller compatibility; the in-app keypad is always visible. */
  autoFocus?: boolean;
  editable?: boolean;
}

// PINs may contain digits, '*' and '#'.
const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function PinBoxInput({
  length,
  value,
  onChangeText,
  editable = true,
}: PinBoxInputProps) {
  const colors = useThemeColors();

  const press = (key: string) => {
    if (editable && value.length < length) onChangeText(value + key);
  };
  const backspace = () => {
    if (editable) onChangeText(value.slice(0, -1));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const isFilled = i < value.length;
          return (
            <View
              key={i}
              style={[
                styles.box,
                {
                  borderColor: colors.border,
                  backgroundColor: isFilled ? colors.accent : colors.surface,
                },
              ]}
            >
              {isFilled && (
                <View
                  style={[styles.dot, { backgroundColor: colors.accentText }]}
                />
              )}
            </View>
          );
        })}
      </View>

      <View style={[styles.pad, !editable && styles.padDisabled]}>
        {KEY_ROWS.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((key) => (
              <Pressable
                key={key}
                onPress={() => press(key)}
                style={({ pressed }) => [
                  styles.key,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.accent : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.keyText, { color: colors.text }]}>
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Pressable
            onPress={backspace}
            style={({ pressed }) => [
              styles.key,
              styles.backspace,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.accent : colors.surface,
              },
            ]}
          >
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 20,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  box: {
    width: 34,
    height: 44,
    borderWidth: BORDER_WIDTH,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pad: {
    gap: 8,
  },
  padDisabled: {
    opacity: 0.5,
  },
  key: {
    width: 64,
    height: 48,
    borderWidth: BORDER_WIDTH,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backspace: {
    width: 64 * 3 + 16,
  },
  keyText: {
    fontSize: 22,
    fontWeight: "800",
  },
});
