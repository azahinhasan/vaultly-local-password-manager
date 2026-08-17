import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

interface PinBoxInputProps {
  length: number;
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

export function PinBoxInput({
  length,
  value,
  onChangeText,
  autoFocus,
  editable = true,
}: PinBoxInputProps) {
  const inputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  const handleChange = (text: string) => {
    onChangeText(text.replace(/[^0-9]/g, "").slice(0, length));
  };

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
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
              <View style={[styles.dot, { backgroundColor: colors.accentText }]} />
            )}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        secureTextEntry
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
});
