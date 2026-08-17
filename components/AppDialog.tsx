import { useThemeColors } from "@/hooks/use-theme-colors";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

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
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
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
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    padding: 32,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
