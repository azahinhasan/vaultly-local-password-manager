import { COLOR_PALETTE } from "@/constants/platforms";
import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

interface ColorSwatchPickerProps {
  value?: string;
  onChange: (color: string | undefined) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
      {COLOR_PALETTE.map((swatch) => {
        const isSelected = value === swatch;
        return (
          <Pressable
            key={swatch}
            onPress={() => onChange(isSelected ? undefined : swatch)}
            style={[
              styles.swatch,
              { backgroundColor: swatch, borderColor: colors.border },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={18} color={colors.text} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: BORDER_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
});
