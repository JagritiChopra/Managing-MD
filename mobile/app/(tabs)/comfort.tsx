// app/(tabs)/comfort.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shows default (read-only, seeded) comforts + user's own (CRUD).
// Users can add, edit and delete their personal comfort items.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DefaultComfort {
  _id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

interface UserComfort {
  _id: string;
  title: string;
  description?: string;
  icon: string;
  createdAt: string;
}

// ── Comfort Form Modal ────────────────────────────────────────────────────────

const EMOJI_PRESETS = ["💙", "🌿", "☁️", "🎵", "📖", "🌊", "🕯️", "🌸", "🧘", "✨", "🌙", "🍵"];

interface ComfortFormProps {
  visible: boolean;
  initial?: Partial<UserComfort>;
  onClose: () => void;
  onSave: (data: { title: string; description: string; icon: string }) => Promise<void>;
}

function ComfortForm({ visible, initial, onClose, onSave }: ComfortFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "💙");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setIcon(initial?.icon ?? "💙");
    }
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title."); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), icon });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.formSheet}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{initial?._id ? "Edit Comfort" : "Add Comfort"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Icon picker */}
          <Text style={styles.fieldLabel}>Pick an Icon</Text>
          <View style={styles.emojiGrid}>
            {EMOJI_PRESETS.map((e) => (
              <TouchableOpacity
                key={e}
                onPress={() => setIcon(e)}
                style={[styles.emojiBtn, icon === e && styles.emojiBtnActive]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Deep breathing"
            placeholderTextColor="#4B5563"
            maxLength={200}
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What does this do for you?"
            placeholderTextColor="#4B5563"
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ComfortScreen() {
  const [defaultComforts, setDefaultComforts] = useState<DefaultComfort[]>([]);
  const [userComforts, setUserComforts] = useState<UserComfort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<UserComfort | undefined>();

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest("/comfort", "GET", undefined, true);
      setDefaultComforts(data.data.defaultComforts ?? []);
      setUserComforts(data.data.userComforts ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleSave = async (data: { title: string; description: string; icon: string }) => {
    if (editing?._id) {
      // Optimistic update
      setUserComforts((prev) => prev.map((c) => c._id === editing._id ? { ...c, ...data } : c));
      await apiRequest(`/comfort/${editing._id}`, "PUT", data, true);
    } else {
      const res = await apiRequest("/comfort", "POST", data, true);
      setUserComforts((prev) => [res.data.comfort, ...prev]);
    }
  };

  const handleDelete = (comfort: UserComfort) => {
    Alert.alert("Delete", `Remove "${comfort.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setUserComforts((prev) => prev.filter((c) => c._id !== comfort._id));
          try {
            await apiRequest(`/comfort/${comfort._id}`, "DELETE", undefined, true);
          } catch (e: any) {
            Alert.alert("Error", e.message);
            fetchAll(); // revert
          }
        },
      },
    ]);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderDefault = ({ item }: { item: DefaultComfort }) => (
    <View style={styles.defaultCard}>
      <Text style={styles.cardIcon}>{item.icon || "💙"}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
      </View>
    </View>
  );

  const renderUser = ({ item }: { item: UserComfort }) => (
    <View style={styles.userCard}>
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {!!item.description && <Text style={styles.cardDesc}>{item.description}</Text>}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => { setEditing(item); setFormVisible(true); }} style={styles.iconBtn}>
          <Ionicons name="pencil" size={15} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
          <Ionicons name="trash" size={15} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color="#3B82F6" size="large" /></View>;
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comfort Corner</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(undefined); setFormVisible(true); }}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Default comforts */}
        <Text style={styles.sectionTitle}>Guided Comforts</Text>
        {defaultComforts.map((item) => (
          <View key={item._id}>{renderDefault({ item })}</View>
        ))}

        {/* User comforts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Comforts</Text>
          <Text style={styles.sectionCount}>{userComforts.length}</Text>
        </View>
        {userComforts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💙</Text>
            <Text style={styles.emptyTitle}>Add your first comfort</Text>
            <Text style={styles.emptyDesc}>What brings you peace? Add it here.</Text>
          </View>
        ) : (
          userComforts.map((item) => (
            <View key={item._id}>{renderUser({ item })}</View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ComfortForm
        visible={formVisible}
        initial={editing}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  centered: { flex: 1, backgroundColor: "#0B1220", alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },
  addBtn: {
    backgroundColor: "#3B82F6",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 10,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 10,
  },

  defaultCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(59,130,246,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
    gap: 12,
  },
  cardIcon: { fontSize: 26, marginTop: 2 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#F1F5F9" },
  cardDesc: { fontSize: 13, color: "#9CA3AF", marginTop: 4, lineHeight: 20 },
  cardActions: { flexDirection: "column", gap: 8, paddingTop: 2 },
  iconBtn: { padding: 4 },

  emptyState: { alignItems: "center", paddingVertical: 32, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F1F5F9" },
  emptyDesc: { fontSize: 13, color: "#6B7280", textAlign: "center" },

  errorText: { color: "#EF4444", fontSize: 14 },
  retryBtn: { backgroundColor: "#3B82F6", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },

  // Form modal
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  formSheet: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 8,
    marginTop: 14,
  },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  emojiBtnActive: { borderColor: "#3B82F6", backgroundColor: "rgba(59,130,246,0.12)" },
  emojiText: { fontSize: 22 },
  input: {
    backgroundColor: "#1F2937",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#374151",
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

