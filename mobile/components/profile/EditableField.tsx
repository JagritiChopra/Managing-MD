// components/profile/EditableField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tap the pencil → field becomes an inline TextInput.
// Confirm with the checkmark → calls onSave(newValue).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  placeholder?: string;
  maxLength?: number;
}

export default function EditableField({
  label,
  value,
  onSave,
  multiline = false,
  keyboardType = "default",
  placeholder,
  maxLength,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={draft}
            onChangeText={setDraft}
            multiline={multiline}
            keyboardType={keyboardType}
            placeholder={placeholder}
            placeholderTextColor="#6B7280"
            maxLength={maxLength}
            autoFocus
          />
          <View style={styles.actions}>
            {saving ? (
              <ActivityIndicator color="#3B82F6" size="small" />
            ) : (
              <>
                <TouchableOpacity onPress={handleSave} style={styles.actionBtn}>
                  <Ionicons name="checkmark-circle" size={26} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancel} style={styles.actionBtn}>
                  <Ionicons name="close-circle" size={26} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.displayRow}
          onPress={() => { setDraft(value); setEditing(true); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.value, !value && styles.placeholder]}>
            {value || placeholder || "Tap to add…"}
          </Text>
          <Ionicons name="pencil" size={14} color="#3B82F6" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 4,
  },
  displayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: 15,
    color: "#F1F5F9",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  placeholder: {
    color: "#4B5563",
    fontStyle: "italic",
  },
  editRow: {
    marginTop: 4,
  },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#F1F5F9",
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  actionBtn: {
    padding: 2,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
});