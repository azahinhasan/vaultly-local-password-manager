import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useRef } from "react";
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
  /** Full-screen layout: keypad spans the screen width at the bottom, and
   * `header` / `footer` are centered above it around the dots. Must be
   * rendered as a flex child of a full-height container. */
  fullScreen?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
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
  fullScreen = false,
  header,
  footer,
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
      containerStyle={fullScreen ? styles.fill : undefined}
      style={[styles.key, !fullScreen && styles.keyFixed]}
    >
      <Text style={[styles.keyText, { color: colors.text }]}>{label}</Text>
    </NeoBrutalCard>
  );

  const ghostStyle = [styles.ghost, fullScreen ? styles.fill : styles.ghostFixed];

  return (
    <View style={fullScreen ? styles.full : styles.compact}>
      <View style={fullScreen ? styles.topFull : styles.top}>
        {header}
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
        {footer}
      </View>

      <View
        style={[
          styles.pad,
          fullScreen && styles.padFull,
          !editable && styles.padDisabled,
        ]}
      >
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
              style={ghostStyle}
            >
              <Ionicons name="finger-print" size={30} color={colors.text} />
            </Pressable>
          ) : (
            <View style={ghostStyle} />
          )}
          {key("0")}
          <Pressable
            onPress={backspace}
            accessibilityRole="button"
            accessibilityLabel="Delete"
            style={ghostStyle}
          >
            <Ionicons name="backspace-outline" size={28} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  compact: {
    alignItems: "center",
    gap: 28,
  },
  full: {
    flex: 1,
    alignSelf: "stretch",
  },
  top: {
    alignItems: "center",
    gap: 28,
  },
  topFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
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
  // Spans the full width, sitting a little above the bottom edge.
  padFull: {
    alignSelf: "stretch",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  padDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  key: {
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  keyFixed: {
    width: 76,
  },
  keyText: {
    fontSize: 26,
    fontWeight: "800",
  },
  // Same footprint as a key (+3dp shadow margin) so the grid stays aligned.
  ghost: {
    height: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostFixed: {
    width: 79,
  },
});
