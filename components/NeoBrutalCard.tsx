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
}

export function NeoBrutalCard({
  children,
  style,
  backgroundColor,
  onPress,
  onLongPress,
}: NeoBrutalCardProps) {
  const colors = useThemeColors();
  const isPressable = !!onPress || !!onLongPress;

  const surfaceStyle = (pressed: boolean): StyleProp<ViewStyle> => [
    styles.surface,
    {
      backgroundColor: backgroundColor ?? colors.surface,
      borderColor: colors.border,
      borderRadius: RADIUS,
      transform: pressed
        ? [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }]
        : [{ translateX: 0 }, { translateY: 0 }],
    },
    style,
  ];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.shadow,
          { backgroundColor: colors.shadow, borderRadius: RADIUS },
        ]}
      />
      {isPressable ? (
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          style={({ pressed }) => surfaceStyle(pressed)}
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
  wrapper: {
    position: "relative",
    marginRight: SHADOW_OFFSET,
    marginBottom: SHADOW_OFFSET,
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
    overflow: "hidden",
  },
});
