import { BORDER_WIDTH, RADIUS, SHADOW_OFFSET } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { StyleProp, StyleSheet, Text, View, ViewStyle, Pressable } from "react-native";

interface NeoBrutalButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "accent" | "surface" | "error";
  style?: StyleProp<ViewStyle>;
}

export function NeoBrutalButton({
  label,
  onPress,
  disabled,
  variant = "accent",
  style,
}: NeoBrutalButtonProps) {
  const colors = useThemeColors();

  const fill =
    variant === "accent"
      ? colors.accent
      : variant === "error"
        ? colors.error
        : colors.surface;
  const textColor =
    variant === "accent"
      ? colors.accentText
      : variant === "error"
        ? colors.errorText
        : colors.text;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.shadow,
          { backgroundColor: colors.shadow, borderRadius: RADIUS },
        ]}
      />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.surface,
          {
            backgroundColor: fill,
            borderColor: colors.border,
            borderRadius: RADIUS,
            opacity: disabled ? 0.5 : 1,
            transform:
              pressed && !disabled
                ? [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }]
                : [{ translateX: 0 }, { translateY: 0 }],
          },
        ]}
      >
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }],
  },
  surface: {
    borderWidth: BORDER_WIDTH,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
});
