// app/(tabs)/journal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full CRUD journal — list, create, edit, delete entries.
// Mood selector, word count, pagination via pull-to-load-more.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTabData } from "../../hooks/useTabData";
import { apiRequest } from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Mood = "great" | "good" | "neutral" | "bad" | "terrible";

interface JournalEntry {
  _id: string;
  entry: string;
  entryDate: string;
  entryTime: string;
  mood: Mood;
  wordCount: number;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS: { key: Mood; emoji: string; label: string; color: string }[] = [
  { key: "great",    emoji: "😄", label: "Great",    color: "#22C55E" },
  { key: "good",     emoji: "🙂", label: "Good",     color: "#84CC16" },
  { key: "neutral",  emoji: "😐", label: "Neutral",  color: "#3B82F6" },
  { key: "bad",      emoji: "😔", label: "Bad",      color: "#F97316" },
  { key: "terrible", emoji: "😢", label: "Terrible", color: "#EF4444" },
];

const moodFor = (key: Mood) => MOODS.find((m) => m.key === key) ?? MOODS[2];

// ── Entry Editor Modal ────────────────────────────────────────────────────────

interface EditorProps {
  visible: boolean;
  initial?: Partial<JournalEntry>;
  onClose: () => void;
  onSave: (data: { entry: string; mood: Mood }) => Promise<void>;
}

function EntryEditor({ visible, initial, onClose, onSave }: EditorProps) {
  const [text, setText] = useState(initial?.entry ?? "");
  const [mood, setMood] = useState<Mood>(initial?.mood ?? "neutral");
  const [saving, setSaving] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSave = async () => {
    if (!text.trim()) { Alert.alert("Empty entry", "Please write something first."); return; }
    setSaving(true);
    try {
      await onSave({ entry: text.trim(), mood });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setText(initial?.entry ?? "");
      setMood(initial?.mood ?? "neutral");
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.editorSheet}>
          {/* Header */}
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={onClose} style={styles.editorHeaderBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>
              {initial?._id ? "Edit Entry" : "New Entry"}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.editorHeaderBtn, styles.saveBtn]}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Mood Picker */}
          <Text style={styles.moodLabel}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMood(m.key)}
                style={[styles.moodBtn, mood === m.key && { borderColor: m.color, backgroundColor: m.color + "22" }]}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodBtnLabel, mood === m.key && { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Text input */}
          <TextInput
            style={styles.entryInput}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Write your thoughts here…"
            placeholderTextColor="#4B5563"
            textAlignVertical="top"
            autoFocus={!initial?._id}
          />
          <Text style={styles.wordCount}>{wordCount} word{wordCount !== 1 ? "s" : ""}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const { items, isLoading, error, refresh, create, update, remove } =
    useTabData<JournalEntry>({ endpoint: "/journal", responseKey: "entries" });

  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openNew = () => { setEditing(undefined); setEditorVisible(true); };
  const openEdit = (entry: JournalEntry) => { setEditing(entry); setEditorVisible(true); };

  const handleSave = async (data: { entry: string; mood: Mood }) => {
    if (editing?._id) {
      await update(editing._id, data);
    } else {
      await create(data);
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert("Delete Entry", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await remove(entry._id); }
          catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const m = moodFor(item.mood);
    return (
      <View style={styles.entryCard}>
        <View style={styles.entryCardHeader}>
          <View style={styles.entryMeta}>
            <Text style={styles.entryEmoji}>{m.emoji}</Text>
            <View>
              <Text style={styles.entryDate}>{formatDate(item.entryDate)}</Text>
              <Text style={[styles.entryMoodLabel, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>
          <View style={styles.entryActions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
              <Ionicons name="pencil" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.entryText} numberOfLines={4}>{item.entry}</Text>
        <Text style={styles.wordCountSmall}>{item.wordCount} words · {item.entryTime}</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isLoading && !items.length ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items as JournalEntry[]}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📓</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyDesc}>Start writing — your thoughts are safe here.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
                <Text style={styles.emptyBtnText}>Write First Entry</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <EntryEditor
        visible={editorVisible}
        initial={editing}
        onClose={() => setEditorVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
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
  listContent: { padding: 16, paddingBottom: 32 },

  // Entry card
  entryCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  entryCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  entryMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  entryEmoji: { fontSize: 26 },
  entryDate: { fontSize: 13, fontWeight: "700", color: "#F1F5F9" },
  entryMoodLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  entryActions: { flexDirection: "row", gap: 8 },
  iconBtn: { padding: 6 },
  entryText: { fontSize: 14, color: "#9CA3AF", lineHeight: 22 },
  wordCountSmall: { fontSize: 11, color: "#4B5563", marginTop: 8, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#F1F5F9" },
  emptyDesc: { fontSize: 13, color: "#6B7280", textAlign: "center", paddingHorizontal: 32 },
  emptyBtn: { backgroundColor: "#3B82F6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  // Error / retry
  errorText: { color: "#EF4444", fontSize: 14, textAlign: "center" },
  retryBtn: { backgroundColor: "#3B82F6", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },

  // Modal / editor
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  editorSheet: {
    flex: 1,
    marginTop: 60,
    backgroundColor: "#0B1220",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  editorHeaderBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  editorTitle: { fontSize: 17, fontWeight: "700", color: "#F1F5F9" },
  cancelText: { color: "#9CA3AF", fontSize: 15, fontWeight: "600" },
  saveBtn: { backgroundColor: "#3B82F6", paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  moodLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  moodRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  moodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },
  moodEmoji: { fontSize: 20 },
  moodBtnLabel: { fontSize: 9, fontWeight: "700", color: "#6B7280", marginTop: 4 },

  entryInput: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: "#F1F5F9",
    lineHeight: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
    textAlignVertical: "top",
  },
  wordCount: { fontSize: 11, color: "#4B5563", textAlign: "right", marginTop: 8, fontWeight: "600" },
});