import { monogramColor } from "@/constants/platforms";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import {
  ComponentProps,
  forwardRef,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** 38dp visual, padded to a 48dp touch target. */
export function BrutalIconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const colors = useThemeColors();
  return (
    <NeoBrutalCard
      onPress={onPress}
      radius={12}
      hitSlop={5}
      accessibilityLabel={label}
      style={styles.iconButton}
    >
      <Ionicons name={icon} size={20} color={color ?? colors.text} />
    </NeoBrutalCard>
  );
}

export function BrutalChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={8}
      style={[
        styles.chip,
        {
          borderColor: colors.border,
          backgroundColor: selected ? colors.text : colors.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.background : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Focus = accent border + accent shadow. */
export const BrutalTextField = forwardRef<
  TextInput,
  TextInputProps & {
    containerStyle?: StyleProp<ViewStyle>;
    invalid?: boolean;
    /** Rendered inside the field, right-aligned (e.g. Generate / eye). */
    right?: ReactNode;
    /** Rendered inside the field, left-aligned (e.g. search icon). */
    left?: ReactNode;
  }
>(function BrutalTextField(
  { containerStyle, invalid, left, right, style, onFocus, onBlur, ...props },
  ref,
) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  const edge = invalid ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={containerStyle}>
      <View style={styles.fieldWrap}>
        {focused && (
          <View
            style={[
              styles.fieldShadow,
              { backgroundColor: colors.accent, borderRadius: RADIUS },
            ]}
          />
        )}
        <View
          style={[
            styles.field,
            { borderColor: edge, backgroundColor: colors.surface },
          ]}
        >
          {left}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.subtext}
            {...props}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.fieldInput, { color: colors.text }, style]}
          />
          {right}
        </View>
      </View>
    </View>
  );
});

export function ToggleSwitch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={[
        styles.toggle,
        {
          borderColor: colors.border,
          backgroundColor: value ? colors.accent : colors.surface,
          alignItems: value ? "flex-end" : "flex-start",
        },
      ]}
    >
      <View
        style={[
          styles.knob,
          { backgroundColor: value ? "#FFFFFF" : colors.text },
        ]}
      />
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.subtext }]}>
      {children}
    </Text>
  );
}

export function Monogram({
  name,
  color,
  size = 44,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        borderWidth: BORDER_WIDTH,
        borderColor: colors.border,
        backgroundColor: color ?? monogramColor(name),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: "#1A1A1A", fontSize: size * 0.42, fontWeight: "900" }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

/** `const [snackbar, show] = useSnackbar()`, then render `{snackbar}` once. */
export function useSnackbar(): [ReactNode, (message: string) => void] {
  const colors = useThemeColors();
  const [message, setMessage] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      clearTimeout(timer.current);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(
        () =>
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(),
        2500,
      );
    },
    [opacity],
  );

  const element = (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.snackbar,
        { opacity, backgroundColor: colors.text, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.snackbarText, { color: colors.background }]}>
        {message}
      </Text>
    </Animated.View>
  );
  return [element, show];
}

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    borderWidth: BORDER_WIDTH,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "800",
  },
  fieldWrap: {
    position: "relative",
    marginRight: 3,
    marginBottom: 3,
  },
  fieldShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 10,
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    borderWidth: BORDER_WIDTH,
    justifyContent: "center",
    padding: 2,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  snackbar: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 96,
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  snackbarText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
