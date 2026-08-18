import { useThemeColors } from "@/hooks/use-theme-colors";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NeoBrutalCard } from "./NeoBrutalCard";
import { PinBoxInput } from "./PinBoxInput";

const PIN_LENGTH = 6;

interface PinPromptDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  error?: string;
  onSubmit: (pin: string) => void | Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin("");
      setIsSubmitting(false);
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      setPin("");
      setIsSubmitting(false);
    }
  }, [error]);

  const performSubmit = async (value: string) => {
    try {
      await onSubmit(value);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (value: string) => {
    setPin(value);
    if (value.length === PIN_LENGTH) {
      // Let the filled-in last digit (and the spinner below) actually paint
      // before decryption's PBKDF2 work blocks the JS thread.
      setIsSubmitting(true);
      setTimeout(() => performSubmit(value), 0);
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
                editable={!isSubmitting}
              />
            </View>
            {isSubmitting && (
              <ActivityIndicator style={styles.spinner} color={colors.accent} />
            )}
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
  spinner: {
    marginBottom: 4,
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
