import { useThemeColors } from "@/hooks/use-theme-colors";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";
import { PinBoxInput } from "./PinBoxInput";

const PIN_LENGTH = 6;

interface PinPromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  error?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

export function PinPromptDialog({
  visible,
  title,
  message,
  error,
  onSubmit,
  onCancel,
}: PinPromptDialogProps) {
  const colors = useThemeColors();
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!visible) {
      setPin("");
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      setPin("");
    }
  }, [error]);

  const handleChange = (value: string) => {
    setPin(value);
    if (value.length === PIN_LENGTH) {
      onSubmit(value);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <NeoBrutalCard>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {!!message && (
              <Text style={[styles.message, { color: colors.subtext }]}>
                {message}
              </Text>
            )}
            <View style={styles.pinRow}>
              <PinBoxInput
                length={PIN_LENGTH}
                value={pin}
                onChangeText={handleChange}
                autoFocus
              />
            </View>
            {!!error && (
              <Text style={[styles.error, { color: colors.error }]}>
                {error}
              </Text>
            )}
            <Pressable onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.accent }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
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
  content: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
    alignItems: "center",
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
    marginBottom: 4,
  },
  pinRow: {
    marginVertical: 8,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
});
