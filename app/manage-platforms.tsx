import { AppDialog, AppDialogOption } from "@/components/AppDialog";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { NeoBrutalButton } from "@/components/NeoBrutalButton";
import { NeoBrutalCard } from "@/components/NeoBrutalCard";
import { COLOR_PALETTE, MAX_PLATFORM_NAME_LENGTH } from "@/constants/platforms";
import { BORDER_WIDTH, RADIUS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { usePlatforms } from "@/context/PlatformsContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { loadEncryptedVault } from "@/utils/vault-storage";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface FormState {
  mode: "add" | "edit";
  originalName?: string;
  name: string;
  color: string;
}

export default function ManagePlatformsScreen() {
  const { vaultKey } = useAuth();
  const { platforms, addPlatform, updatePlatform, removePlatform } =
    usePlatforms();
  const router = useRouter();
  const colors = useThemeColors();

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    options: AppDialogOption[];
  } | null>(null);
  const closeDialog = () => setDialog(null);

  if (!vaultKey) {
    return <Redirect href="/" />;
  }

  const openAddForm = () => {
    setFormError("");
    setForm({ mode: "add", name: "", color: COLOR_PALETTE[0] });
  };

  const openEditForm = (name: string, color: string) => {
    setFormError("");
    setForm({ mode: "edit", originalName: name, name, color });
  };

  const closeForm = () => {
    setForm(null);
    setFormError("");
  };

  const handleSaveForm = async () => {
    if (!form) {
      return;
    }

    setFormError("");
    setIsSaving(true);
    const result =
      form.mode === "add"
        ? await addPlatform(form.name, form.color)
        : await updatePlatform(form.originalName!, form.name, form.color);
    setIsSaving(false);

    if (result.success) {
      closeForm();
    } else {
      setFormError(result.error ?? "Failed to save.");
    }
  };

  const confirmDeletePlatform = async (name: string) => {
    await removePlatform(name);
    closeForm();
  };

  const handleDeleteRequest = async () => {
    if (!form || form.mode !== "edit" || !form.originalName) {
      return;
    }
    const name = form.originalName;

    const entries = await loadEncryptedVault(vaultKey);
    const usageCount = entries.filter((entry) => entry.platform === name).length;

    setDialog({
      title: "Delete platform?",
      message:
        usageCount > 0
          ? `${usageCount} ${usageCount === 1 ? "entry uses" : "entries use"} "${name}". Deleting it won't delete those entries — they'll just fall back to a default color and show under "Other".`
          : `Delete "${name}"? This can't be undone.`,
      options: [
        {
          label: "Delete",
          destructive: true,
          onPress: () => confirmDeletePlatform(name),
        },
      ],
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Platforms</Text>
        <Pressable onPress={openAddForm} hitSlop={12}>
          <Ionicons name="add-circle" size={28} color={colors.accent} />
        </Pressable>
      </View>

      <FlatList
        data={platforms}
        keyExtractor={(p) => p.name}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NeoBrutalCard onPress={() => openEditForm(item.name, item.color)}>
            <View style={styles.row}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: item.color, borderColor: colors.border },
                ]}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {item.name}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
            </View>
          </NeoBrutalCard>
        )}
      />

      <Modal
        visible={form !== null}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalKeyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.backdrop} onPress={closeForm}>
            <NeoBrutalCard>
              <View style={styles.formContent}>
                <Text style={[styles.formTitle, { color: colors.text }]}>
                  {form?.mode === "add" ? "Add Platform" : "Edit Platform"}
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={form?.name ?? ""}
                  onChangeText={(name) =>
                    setForm((prev) => (prev ? { ...prev, name } : prev))
                  }
                  placeholder="Platform name"
                  placeholderTextColor={colors.subtext}
                  maxLength={MAX_PLATFORM_NAME_LENGTH}
                  autoFocus
                />

                <ColorSwatchPicker
                  value={form?.color}
                  onChange={(color) => {
                    if (color) {
                      setForm((prev) => (prev ? { ...prev, color } : prev));
                    }
                  }}
                />

                {!!formError && (
                  <Text style={[styles.error, { color: colors.error }]}>
                    {formError}
                  </Text>
                )}

                <NeoBrutalButton
                  label={isSaving ? "Saving..." : "Save"}
                  onPress={handleSaveForm}
                  disabled={isSaving}
                  style={styles.saveButton}
                />

                {form?.mode === "edit" && (
                  <NeoBrutalButton
                    label="Delete"
                    onPress={handleDeleteRequest}
                    variant="error"
                  />
                )}

                <Pressable onPress={closeForm}>
                  <Text style={[styles.cancelText, { color: colors.accent }]}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </NeoBrutalCard>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <AppDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        options={dialog?.options ?? []}
        onDismiss={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  list: {
    padding: 24,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: BORDER_WIDTH,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  modalKeyboardAvoiding: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 32,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  formTitle: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  input: {
    borderWidth: BORDER_WIDTH,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  saveButton: {
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
});
