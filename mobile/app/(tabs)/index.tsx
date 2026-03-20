// app/(tabs)/index.tsx  (Home Tab)
// ─────────────────────────────────────────────────────────────────────────────
// • Daily motivational quote (refreshable)
// • Default tasks (togglable ✓/✗, seeded from backend)
// • User custom tasks (create, complete, edit, delete)
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
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../services/api";
import { useUser } from "../../context/UserContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Quote {
  _id: string;
  text: string;
  author?: string;
}

interface DefaultTask {
  _id: string;
  title: string;
  description?: string;
  icon?: string;
  order: number;
  status: "pending" | "completed";
}

interface UserTask {
  _id: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  status: "pending" | "completed";
  createdAt: string;
}

// ── Task Form Modal ───────────────────────────────────────────────────────────

interface TaskFormProps {
  visible: boolean;
  initial?: Partial<UserTask>;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => Promise<void>;
}

function TaskForm({ visible, initial, onClose, onSave }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
    }
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert("Required", "Task title cannot be empty."); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
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
            <Text style={styles.formTitle}>{initial?._id ? "Edit Task" : "New Task"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What do you want to do?"
            placeholderTextColor="#4B5563"
            maxLength={200}
            autoFocus={!initial?._id}
          />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add more detail…"
            placeholderTextColor="#4B5563"
            multiline
            maxLength={500}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={styles.saveBtnText}>{initial?._id ? "Update Task" : "Add Task"}</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useUser();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  const [defaultTasks, setDefaultTasks] = useState<DefaultTask[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | undefined>();

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchQuote = useCallback(async () => {
    setQuoteLoading(true);
    try {
      const data = await apiRequest("/home/quote", "GET", undefined, true);
      setQuote(data.data.quote ?? null);
    } catch { /* non-fatal */ }
    finally { setQuoteLoading(false); }
  }, []);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const [defaultRes, userRes] = await Promise.all([
        apiRequest("/home/default-tasks", "GET", undefined, true),
        apiRequest("/home/tasks", "GET", undefined, true),
      ]);
      setDefaultTasks(defaultRes.data.tasks ?? []);
      setUserTasks(userRes.data.tasks ?? []);
    } catch (e: any) {
      Alert.alert("Error loading tasks", e.message);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuote(); fetchTasks(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchQuote(), fetchTasks()]);
    setRefreshing(false);
  };

  // ── Default task toggle ─────────────────────────────────────────────────────
  const toggleDefaultTask = async (task: DefaultTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    // Optimistic
    setDefaultTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: newStatus } : t));
    try {
      await apiRequest(`/home/default-tasks/${task._id}/status`, "PUT", { status: newStatus }, true);
    } catch (e: any) {
      // Revert
      setDefaultTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: task.status } : t));
      Alert.alert("Error", e.message);
    }
  };

  // ── User task CRUD ──────────────────────────────────────────────────────────
  const handleSaveTask = async (data: { title: string; description: string }) => {
    if (editingTask?._id) {
      setUserTasks((prev) => prev.map((t) => t._id === editingTask._id ? { ...t, ...data } : t));
      await apiRequest(`/home/tasks/${editingTask._id}`, "PUT", data, true);
    } else {
      const res = await apiRequest("/home/tasks", "POST", data, true);
      setUserTasks((prev) => [res.data.task, ...prev]);
    }
  };

  const toggleUserTask = async (task: UserTask) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setUserTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: newStatus } : t));
    try {
      await apiRequest(`/home/tasks/${task._id}/status`, "PUT", { status: newStatus }, true);
    } catch (e: any) {
      setUserTasks((prev) => prev.map((t) => t._id === task._id ? { ...t, status: task.status } : t));
      Alert.alert("Error", e.message);
    }
  };

  const deleteUserTask = (task: UserTask) => {
    Alert.alert("Delete Task", `Remove "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setUserTasks((prev) => prev.filter((t) => t._id !== task._id));
          try {
            await apiRequest(`/home/tasks/${task._id}`, "DELETE", undefined, true);
          } catch (e: any) {
            Alert.alert("Error", e.message);
            fetchTasks();
          }
        },
      },
    ]);
  };

  const completedDefault = defaultTasks.filter((t) => t.status === "completed").length;
  const completedUser = userTasks.filter((t) => t.status === "completed").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.userName}>{user?.name?.split(" ")[0] ?? "Friend"} 👋</Text>
        </View>
        <TouchableOpacity onPress={fetchQuote} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* ── Quote card ────────────────────────────────────────────────────── */}
        <View style={styles.quoteCard}>
          {quoteLoading ? (
            <ActivityIndicator color="#3B82F6" />
          ) : quote ? (
            <>
              <Ionicons name="quote" size={22} color="#3B82F6" style={{ marginBottom: 8 }} />
              <Text style={styles.quoteText}>{quote.text}</Text>
              {!!quote.author && <Text style={styles.quoteAuthor}>— {quote.author}</Text>}
            </>
          ) : (
            <Text style={styles.quoteText}>Stay present. 🌿</Text>
          )}
        </View>

        {/* ── Default Tasks ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Practices</Text>
          <Text style={styles.sectionBadge}>{completedDefault}/{defaultTasks.length}</Text>
        </View>

        {tasksLoading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginVertical: 20 }} />
        ) : defaultTasks.length === 0 ? (
          <Text style={styles.emptyNote}>No practices set up yet.</Text>
        ) : (
          defaultTasks.map((task) => (
            <TouchableOpacity
              key={task._id}
              style={styles.taskCard}
              onPress={() => toggleDefaultTask(task)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, task.status === "completed" && styles.checkboxDone]}>
                {task.status === "completed" && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.status === "completed" && styles.taskTitleDone]}>
                  {task.icon ? `${task.icon} ` : ""}{task.title}
                </Text>
                {!!task.description && (
                  <Text style={styles.taskDesc}>{task.description}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* ── User Tasks ────────────────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          <View style={styles.sectionRight}>
            <Text style={styles.sectionBadge}>{completedUser}/{userTasks.length}</Text>
            <TouchableOpacity
              style={styles.addTaskBtn}
              onPress={() => { setEditingTask(undefined); setFormVisible(true); }}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {userTasks.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyTaskPrompt}
            onPress={() => { setEditingTask(undefined); setFormVisible(true); }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.emptyTaskText}>Add your first personal task</Text>
          </TouchableOpacity>
        ) : (
          userTasks.map((task) => (
            <View key={task._id} style={styles.taskCard}>
              <TouchableOpacity onPress={() => toggleUserTask(task)}>
                <View style={[styles.checkbox, task.status === "completed" && styles.checkboxDone]}>
                  {task.status === "completed" && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.status === "completed" && styles.taskTitleDone]}>
                  {task.title}
                </Text>
                {!!task.description && <Text style={styles.taskDesc}>{task.description}</Text>}
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity
                  onPress={() => { setEditingTask(task); setFormVisible(true); }}
                  style={styles.iconBtn}
                >
                  <Ionicons name="pencil" size={14} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteUserTask(task)} style={styles.iconBtn}>
                  <Ionicons name="trash" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <TaskForm
        visible={formVisible}
        initial={editingTask}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveTask}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  greeting: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  userName: { fontSize: 22, fontWeight: "800", color: "#F1F5F9" },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Quote
  quoteCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    minHeight: 90,
    justifyContent: "center",
  },
  quoteText: { fontSize: 15, color: "#F1F5F9", lineHeight: 24, fontStyle: "italic" },
  quoteAuthor: { fontSize: 12, color: "#3B82F6", fontWeight: "700", marginTop: 10 },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#6B7280",
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  addTaskBtn: {
    backgroundColor: "#3B82F6",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // Task
  taskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxDone: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: "600", color: "#F1F5F9" },
  taskTitleDone: { textDecorationLine: "line-through", color: "#4B5563" },
  taskDesc: { fontSize: 12, color: "#6B7280", marginTop: 3, lineHeight: 18 },
  taskActions: { flexDirection: "row", gap: 6 },
  iconBtn: { padding: 4 },

  emptyNote: { fontSize: 13, color: "#4B5563", textAlign: "center", paddingVertical: 16 },
  emptyTaskPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    borderRadius: 14,
    borderStyle: "dashed",
  },
  emptyTaskText: { fontSize: 14, color: "#3B82F6", fontWeight: "600" },

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
  input: {
    backgroundColor: "#0B1220",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#374151",
  },
  saveBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});