import { BORDER_WIDTH } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";

export interface AppDialogOption {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  options: AppDialogOption[];
  onDismiss: () => void;
}

export function AppDialog({
  visible,
  title,
  message,
  options,
  onDismiss,
}: AppDialogProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <NeoBrutalCard>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {!!message && (
              <Text style={[styles.message, { color: colors.subtext }]}>
                {message}
              </Text>
            )}
          </View>

          {options.map((option, index) => (
            <View key={index}>
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
              <Pressable
                style={styles.option}
                onPress={() => {
                  onDismiss();
                  option.onPress?.();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: option.destructive ? colors.error : colors.accent },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </NeoBrutalCard>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  separator: {
    height: BORDER_WIDTH,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
});
