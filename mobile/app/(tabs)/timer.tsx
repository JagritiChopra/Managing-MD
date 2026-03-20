// app/(tabs)/timer.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Live stopwatch to track daydreaming sessions.
// When stopped → log session with emotion picker → saved to /api/timer/sessions.
// History list is paginated and deletable.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTabData } from "../../hooks/useTabData";

// ── Types ─────────────────────────────────────────────────────────────────────

type Emotion =
  | "happy" | "sad" | "anxious" | "bored"
  | "stressed" | "calm" | "excited" | "neutral" | "other";

interface Session {
  _id: string;
  duration: number;         // seconds
  emotion: Emotion;
  emotionNote?: string;
  notes?: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMOTIONS: { key: Emotion; emoji: string; label: string; color: string }[] = [
  { key: "calm",     emoji: "😌", label: "Calm",     color: "#22C55E" },
  { key: "happy",    emoji: "😄", label: "Happy",    color: "#84CC16" },
  { key: "neutral",  emoji: "😐", label: "Neutral",  color: "#3B82F6" },
  { key: "bored",    emoji: "😑", label: "Bored",    color: "#A78BFA" },
  { key: "anxious",  emoji: "😰", label: "Anxious",  color: "#F97316" },
  { key: "stressed", emoji: "😤", label: "Stressed", color: "#EF4444" },
  { key: "sad",      emoji: "😔", label: "Sad",      color: "#60A5FA" },
  { key: "excited",  emoji: "🤩", label: "Excited",  color: "#F472B6" },
  { key: "other",    emoji: "🤔", label: "Other",    color: "#9CA3AF" },
];

const emotionFor = (key: Emotion) => EMOTIONS.find((e) => e.key === key) ?? EMOTIONS[2];

const fmtTime = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const fmtDuration = (secs: number) => {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
};

// ── Log Session Modal ─────────────────────────────────────────────────────────

interface LogModalProps {
  visible: boolean;
  duration: number;
  startedAt: Date | null;
  onSave: (data: {
    duration: number;
    emotion: Emotion;
    emotionNote: string;
    notes: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  onDiscard: () => void;
}

function LogSessionModal({ visible, duration, startedAt, onSave, onDiscard }: LogModalProps) {
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [emotionNote, setEmotionNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const now = new Date();
    const start = startedAt ?? new Date(now.getTime() - duration * 1000);
    const startTime = start.toTimeString().slice(0, 5);
    const endTime = now.toTimeString().slice(0, 5);

    setSaving(true);
    try {
      await onSave({ duration, emotion, emotionNote, notes, startTime, endTime });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (visible) { setEmotion("neutral"); setEmotionNote(""); setNotes(""); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDiscard}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.logSheet}>
          <Text style={styles.logTitle}>Log Session</Text>
          <Text style={styles.logDuration}>{fmtDuration(duration)}</Text>

          <Text style={styles.fieldLabel}>How did you feel during the daydream?</Text>
          <View style={styles.emotionGrid}>
            {EMOTIONS.map((e) => (
              <TouchableOpacity
                key={e.key}
                onPress={() => setEmotion(e.key)}
                style={[styles.emotionBtn, emotion === e.key && { borderColor: e.color, backgroundColor: e.color + "22" }]}
              >
                <Text style={styles.emotionEmoji}>{e.emoji}</Text>
                <Text style={[styles.emotionLabel, emotion === e.key && { color: e.color }]}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Emotion note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={emotionNote}
            onChangeText={setEmotionNote}
            placeholder="What triggered this?"
            placeholderTextColor="#4B5563"
            maxLength={200}
          />

          <Text style={styles.fieldLabel}>Additional notes (optional)</Text>
          <TextInput
            style={[styles.noteInput, { minHeight: 60, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else to note…"
            placeholderTextColor="#4B5563"
            multiline
            maxLength={500}
          />

          <View style={styles.logBtns}>
            <TouchableOpacity style={styles.discardBtn} onPress={onDiscard}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveSessionBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.saveSessionText}>Save Session</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TimerScreen() {
  const { items, isLoading, error, refresh, create, remove } =
    useTabData<Session>({ endpoint: "/timer/sessions", responseKey: "sessions" });

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer logic ─────────────────────────────────────────────────────────────
  const startTimer = () => {
    setStartedAt(new Date());
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setShowLog(true);
  };

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setElapsed(0);
    setStartedAt(null);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // ── Save session ────────────────────────────────────────────────────────────
  const handleSaveSession = async (data: any) => {
    await create({ ...data, sessionDate: new Date().toISOString() });
    setShowLog(false);
    setElapsed(0);
    setStartedAt(null);
  };

  const handleDiscard = () => {
    setShowLog(false);
    setElapsed(0);
    setStartedAt(null);
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (session: Session) => {
    Alert.alert("Delete Session", "Remove this session log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try { await remove(session._id); }
          catch (e: any) { Alert.alert("Error", e.message); }
        },
      },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  // ── Progress ring color ─────────────────────────────────────────────────────
  const timerColor = elapsed < 300 ? "#22C55E" : elapsed < 600 ? "#3B82F6" : "#EF4444";

  const renderSession = ({ item }: { item: Session }) => {
    const e = emotionFor(item.emotion);
    const date = new Date(item.sessionDate).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionLeft}>
          <Text style={styles.sessionEmoji}>{e.emoji}</Text>
          <View>
            <Text style={styles.sessionDuration}>{fmtDuration(item.duration)}</Text>
            <Text style={styles.sessionDate}>{date} {item.startTime && `· ${item.startTime}`}</Text>
            {!!item.emotionNote && <Text style={styles.sessionNote}>{item.emotionNote}</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={17} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Session Timer</Text>
      </View>

      {/* ── Stopwatch ────────────────────────────────────────────────────────── */}
      <View style={styles.timerContainer}>
        <View style={[styles.timerRing, { borderColor: timerColor }]}>
          <Text style={[styles.timerDisplay, { color: timerColor }]}>{fmtTime(elapsed)}</Text>
          <Text style={styles.timerSub}>{running ? "Recording…" : elapsed > 0 ? "Paused" : "Ready"}</Text>
        </View>

        <View style={styles.timerBtns}>
          {!running ? (
            <TouchableOpacity style={styles.startBtn} onPress={startTimer}>
              <Ionicons name="play" size={28} color="#FFFFFF" />
              <Text style={styles.startBtnText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}>
              <Ionicons name="stop" size={28} color="#fff" />
              <Text style={styles.stopBtnText}>Stop & Log</Text>
            </TouchableOpacity>
          )}
          {!running && elapsed > 0 && (
            <TouchableOpacity style={styles.resetBtn} onPress={resetTimer}>
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Session History ───────────────────────────────────────────────────── */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Session History</Text>
        <Text style={styles.historyCount}>{(items as Session[]).length} sessions</Text>
      </View>

      {isLoading && !(items as Session[]).length ? (
        <View style={styles.centered}><ActivityIndicator color="#3B82F6" /></View>
      ) : (
        <FlatList
          data={items as Session[]}
          keyExtractor={(i) => i._id}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⏱️</Text>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyDesc}>Start a timer to track your daydreaming.</Text>
            </View>
          }
        />
      )}

      <LogSessionModal
        visible={showLog}
        duration={elapsed}
        startedAt={startedAt}
        onSave={handleSaveSession}
        onDiscard={handleDiscard}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  centered: { paddingTop: 32, alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },

  // Timer
  timerContainer: { alignItems: "center", paddingVertical: 32 },
  timerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    backgroundColor: "#111827",
  },
  timerDisplay: { fontSize: 42, fontWeight: "800", fontVariant: ["tabular-nums"] },
  timerSub: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  timerBtns: { flexDirection: "row", alignItems: "center", gap: 12 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 50,
  },
  startBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EF4444",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 50,
  },
  stopBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  resetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },

  // History
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  historyTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" },
  historyCount: { fontSize: 12, color: "#3B82F6", fontWeight: "700" },
  listContent: { padding: 16, paddingBottom: 32 },

  sessionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  sessionLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  sessionEmoji: { fontSize: 24 },
  sessionDuration: { fontSize: 16, fontWeight: "800", color: "#F1F5F9" },
  sessionDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  sessionNote: { fontSize: 12, color: "#9CA3AF", marginTop: 4, fontStyle: "italic" },
  iconBtn: { padding: 4 },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#F1F5F9" },
  emptyDesc: { fontSize: 13, color: "#6B7280", textAlign: "center" },

  // Log modal
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  logSheet: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  logTitle: { fontSize: 20, fontWeight: "800", color: "#F1F5F9", textAlign: "center" },
  logDuration: { fontSize: 36, fontWeight: "800", color: "#3B82F6", textAlign: "center", marginVertical: 8 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 8,
    marginTop: 14,
  },
  emotionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emotionBtn: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0B1220",
  },
  emotionEmoji: { fontSize: 22 },
  emotionLabel: { fontSize: 10, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  noteInput: {
    backgroundColor: "#0B1220",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#374151",
  },
  logBtns: { flexDirection: "row", gap: 12, marginTop: 20 },
  discardBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  discardText: { color: "#9CA3AF", fontWeight: "700", fontSize: 14 },
  saveSessionBtn: {
    flex: 2,
    backgroundColor: "#3B82F6",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  saveSessionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});