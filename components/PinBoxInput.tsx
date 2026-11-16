import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";

interface PinBoxInputProps {
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  /** Kept for caller compatibility; the in-app keypad is always visible. */
  autoFocus?: boolean;
  editable?: boolean;
  /** Shows the biometric key in the bottom-left slot (unlock only). */
  onBiometric?: () => void;
  /** Bump this number to shake the dots (wrong PIN). */
  shakeSignal?: number;
}

const KEY_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function PinBoxInput({
  length,
  value,
  onChangeText,
  editable = true,
  onBiometric,
  shakeSignal = 0,
}: PinBoxInputProps) {
  const colors = useThemeColors();
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shakeSignal) return;
    Animated.sequence(
      [10, -10, 8, -8, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  }, [shakeSignal, shake]);

  const press = (key: string) => {
    if (editable && value.length < length) onChangeText(value + key);
  };
  const backspace = () => {
    if (editable) onChangeText(value.slice(0, -1));
  };

  const key = (label: string) => (
    <NeoBrutalCard
      key={label}
      radius={18}
      onPress={() => press(label)}
      accessibilityLabel={label}
      style={styles.key}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{label}</Text>
    </NeoBrutalCard>
  );

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.dots, { transform: [{ translateX: shake }] }]}
        accessible
        accessibilityLabel={`${value.length} of ${length} digits entered`}
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: colors.border,
                  backgroundColor: filled ? colors.accent : "transparent",
                  transform: [{ scale: filled ? 1.12 : 1 }],
                },
              ]}
            />
          );
        })}
      </Animated.View>

      <View style={[styles.pad, !editable && styles.padDisabled]}>
        {KEY_ROWS.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map(key)}
          </View>
        ))}
        <View style={styles.row}>
          {onBiometric ? (
            <Pressable
              onPress={onBiometric}
              accessibilityRole="button"
              accessibilityLabel="Unlock with biometrics"
              style={styles.ghost}
            >
              <Ionicons name="finger-print" size={30} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.ghost} />
          )}
          {key("0")}
          <Pressable
            onPress={backspace}
            accessibilityRole="button"
            accessibilityLabel="Delete"
            style={styles.ghost}
          >
            <Ionicons name="backspace-outline" size={28} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 28,
  },
  dots: {
    flexDirection: "row",
    gap: 14,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: BORDER_WIDTH,
  },
  pad: {
    gap: 6,
  },
  padDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    width: 76,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 26,
    fontWeight: "800",
  },
  // Same footprint as a key (+3dp shadow margin) so the grid stays aligned.
  ghost: {
    width: 79,
    height: 65,
    alignItems: "center",
    justifyContent: "center",
  },
});
