import { BORDER_WIDTH, RADIUS, SHADOW_OFFSET } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface NeoBrutalCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  radius?: number;
  /** Hard-shadow offset; also the distance the card sinks when pressed. */
  offset?: number;
  borderColor?: string;
  accessibilityLabel?: string;
  hitSlop?: number;
  disabled?: boolean;
}

export function NeoBrutalCard({
  children,
  style,
  backgroundColor,
  onPress,
  onLongPress,
  radius = RADIUS,
  offset = SHADOW_OFFSET,
  borderColor,
  accessibilityLabel,
  hitSlop,
  disabled,
}: NeoBrutalCardProps) {
  const colors = useThemeColors();
  const isPressable = !!onPress || !!onLongPress;

  const surfaceStyle = (pressed: boolean): StyleProp<ViewStyle> => [
    styles.surface,
    {
      backgroundColor: backgroundColor ?? colors.surface,
      borderColor: borderColor ?? colors.border,
      borderRadius: radius,
      transform: pressed
        ? [{ translateX: offset }, { translateY: offset }]
        : [{ translateX: 0 }, { translateY: 0 }],
    },
    style,
  ];

  return (
    <View
      style={{ position: "relative", marginRight: offset, marginBottom: offset }}
    >
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: colors.shadow,
            borderRadius: radius,
            transform: [{ translateX: offset }, { translateY: offset }],
          },
        ]}
      />
      {isPressable ? (
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          disabled={disabled}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => surfaceStyle(pressed && !disabled)}
        >
          {children}
        </Pressable>
      ) : (
        <View style={surfaceStyle(false)}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  surface: {
    borderWidth: BORDER_WIDTH,
    overflow: "hidden",
  },
});
