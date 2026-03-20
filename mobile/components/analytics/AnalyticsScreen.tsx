// components/analytics/AnalyticsScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Monthly analytics — daydream sessions, task completion, comfort usage.
// All charts are hand-drawn with React Native primitives (no chart library).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Session {
  _id: string;
  duration: number; // seconds
  emotion: string;
  sessionDate: string;
}

interface Task {
  _id: string;
  status: "pending" | "completed";
  createdAt: string;
}

interface DefaultTask {
  _id: string;
  status: "pending" | "completed";
}

interface Comfort {
  _id: string;
  title: string;
  icon: string;
  createdAt: string;
}

interface AnalyticsData {
  sessions: Session[];
  tasks: Task[];
  defaultTasks: DefaultTask[];
  userComforts: Comfort[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMOTIONS: Record<string, { emoji: string; color: string }> = {
  calm:     { emoji: "😌", color: "#22C55E" },
  happy:    { emoji: "😄", color: "#84CC16" },
  neutral:  { emoji: "😐", color: "#3B82F6" },
  bored:    { emoji: "😑", color: "#A78BFA" },
  anxious:  { emoji: "😰", color: "#F97316" },
  stressed: { emoji: "😤", color: "#EF4444" },
  sad:      { emoji: "😔", color: "#60A5FA" },
  excited:  { emoji: "🤩", color: "#F472B6" },
  other:    { emoji: "🤔", color: "#9CA3AF" },
};

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// ── Animated Arc (Radial Progress) ────────────────────────────────────────────

function RadialRing({
  value,
  max,
  size = 110,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  const animVal = useRef(new Animated.Value(0)).current;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: pct,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const R = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * R;
  const strokeDash = circumference * pct;

  // We use a View with border trick since SVG isn't native — use border-based arc
  const degrees = pct * 360;

  return (
    <View style={{ alignItems: "center", width: size + 20 }}>
      {/* Ring built with overflow:hidden + rotation trick */}
      <View style={{ width: size, height: size, position: "relative", alignItems: "center", justifyContent: "center" }}>
        {/* Background ring */}
        <View style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 6,
          borderColor: "rgba(255,255,255,0.06)",
        }} />
        {/* Progress arc using clip approach */}
        <ProgressArc size={size} pct={pct} color={color} />
        {/* Center content */}
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.5 }}>
            {value}
          </Text>
          <Text style={{ fontSize: 9, color: "#6B7280", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>
            {sublabel}
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginTop: 8, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

// Draws arc via nested Views with border + overflow trick
function ProgressArc({ size, pct, color }: { size: number; pct: number; color: string }) {
  const deg = pct * 360;
  const half = size / 2;

  return (
    <View style={{ position: "absolute", width: size, height: size }}>
      {/* Left half */}
      <View style={{
        position: "absolute", width: half, height: size,
        left: 0, overflow: "hidden",
      }}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 6, borderColor: deg > 180 ? color : "transparent",
          transform: [{ rotate: `${Math.min(deg - 180, 180)}deg` }],
        }} />
      </View>
      {/* Right half */}
      <View style={{
        position: "absolute", width: half, height: size,
        left: half, overflow: "hidden",
      }}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: 6, borderColor: deg > 0 ? color : "transparent",
          marginLeft: -half,
          transform: [{ rotate: `${Math.min(deg, 180)}deg` }],
        }} />
      </View>
    </View>
  );
}

// ── Daily Heatmap ─────────────────────────────────────────────────────────────

function DayHeatmap({
  year,
  month,
  activeDays,
  intensityMap,
  color,
}: {
  year: number;
  month: number;
  activeDays: Set<number>;
  intensityMap: Record<number, number>;
  color: string;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const cells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const maxIntensity = Math.max(...Object.values(intensityMap), 1);

  const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
  const cellSize = Math.floor((CHART_WIDTH - 16) / 7) - 4;

  return (
    <View>
      <View style={{ flexDirection: "row", marginBottom: 6, paddingHorizontal: 2 }}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={{
            width: cellSize + 4, textAlign: "center",
            fontSize: 9, color: "#4B5563", fontWeight: "700",
          }}>{d}</Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {/* Empty cells for offset */}
        {Array.from({ length: firstDay }, (_, i) => (
          <View key={`empty-${i}`} style={{ width: cellSize, height: cellSize }} />
        ))}
        {cells.map((day) => {
          const intensity = intensityMap[day] ?? 0;
          const alpha = intensity > 0 ? 0.2 + (intensity / maxIntensity) * 0.8 : 0;
          const bg = intensity > 0
            ? `rgba(${hexToRgb(color)},${alpha.toFixed(2)})`
            : "rgba(255,255,255,0.04)";
          const isToday = day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();

          return (
            <View
              key={day}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 5,
                backgroundColor: bg,
                borderWidth: isToday ? 1.5 : 0,
                borderColor: isToday ? color : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{
                fontSize: 8,
                color: intensity > 0 ? "#F1F5F9" : "#374151",
                fontWeight: intensity > 0 ? "700" : "400",
              }}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Bar Spark Chart ───────────────────────────────────────────────────────────

function SparkBars({
  data,
  color,
  height = 60,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;
  const max = Math.max(...data, 1);

  useEffect(() => {
    const anims = animVals.map((v, i) =>
      Animated.timing(v, {
        toValue: data[i] / max,
        duration: 600,
        delay: i * 40,
        useNativeDriver: false,
      })
    );
    Animated.stagger(40, anims).start();
  }, [data.join(",")]);

  const barWidth = Math.floor(CHART_WIDTH / data.length) - 3;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 3 }}>
      {data.map((val, i) => (
        <Animated.View
          key={i}
          style={{
            width: barWidth,
            height: animVals[i].interpolate({
              inputRange: [0, 1],
              outputRange: [2, height],
            }),
            backgroundColor: val > 0 ? color : "rgba(255,255,255,0.06)",
            borderRadius: 4,
            opacity: val > 0 ? 1 : 0.4,
          }}
        />
      ))}
    </View>
  );
}

// ── Emotion Breakdown Bars ────────────────────────────────────────────────────

function EmotionBreakdown({ sessions }: { sessions: Session[] }) {
  const counts: Record<string, number> = {};
  sessions.forEach((s) => {
    counts[s.emotion] = (counts[s.emotion] ?? 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const max = sorted[0]?.[1] ?? 1;
  const animVals = useRef(sorted.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(80, sorted.map((_, i) =>
      Animated.timing(animVals[i], {
        toValue: 1,
        duration: 700,
        delay: i * 60,
        useNativeDriver: false,
      })
    )).start();
  }, [sessions.length]);

  if (sorted.length === 0) {
    return <Text style={styles.emptyNote}>No sessions this month.</Text>;
  }

  return (
    <View style={{ gap: 12 }}>
      {sorted.map(([emotion, count], i) => {
        const e = EMOTIONS[emotion] ?? EMOTIONS.other;
        const pct = count / max;
        return (
          <View key={emotion} style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 16 }}>{e.emoji}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#E5E7EB", textTransform: "capitalize" }}>
                  {emotion}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: e.color }}>{count}x</Text>
            </View>
            <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
              <Animated.View style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: e.color,
                width: animVals[i]?.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", `${pct * 100}%`],
                }) ?? `${pct * 100}%`,
              }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}30` }]}>
      <View style={[styles.statPillIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.statPillValue}>{value}</Text>
        <Text style={styles.statPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AnalyticsScreen({ onClose }: { onClose: () => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sessionsRes, tasksRes, defaultTasksRes, comfortRes] = await Promise.all([
        apiRequest("/timer/sessions", "GET", undefined, true),
        apiRequest("/home/tasks", "GET", undefined, true),
        apiRequest("/home/default-tasks", "GET", undefined, true),
        apiRequest("/comfort", "GET", undefined, true),
      ]);

      setData({
        sessions: sessionsRes.data?.sessions ?? sessionsRes.data ?? [],
        tasks: tasksRes.data?.tasks ?? tasksRes.data ?? [],
        defaultTasks: defaultTasksRes.data?.tasks ?? defaultTasksRes.data ?? [],
        userComforts: comfortRes.data?.userComforts ?? [],
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filter to selected month ─────────────────────────────────────────────
  const inMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === month;
  };

  const monthSessions = (data?.sessions ?? []).filter((s) => inMonth(s.sessionDate));
  const monthTasks = (data?.tasks ?? []).filter((t) => inMonth(t.createdAt));

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalDuration = monthSessions.reduce((sum, s) => sum + s.duration, 0);
  const avgDuration = monthSessions.length > 0 ? totalDuration / monthSessions.length : 0;
  const longestSession = monthSessions.reduce((max, s) => Math.max(max, s.duration), 0);

  const completedTasks = monthTasks.filter((t) => t.status === "completed").length;
  const completedDefault = (data?.defaultTasks ?? []).filter((t) => t.status === "completed").length;
  const totalDefault = (data?.defaultTasks ?? []).length;
  const taskCompletionRate = monthTasks.length > 0
    ? Math.round((completedTasks / monthTasks.length) * 100)
    : 0;

  const totalComforts = data?.userComforts.length ?? 0;

  // ── Heatmap: sessions per day ────────────────────────────────────────────
  const sessionIntensity: Record<number, number> = {};
  monthSessions.forEach((s) => {
    const d = new Date(s.sessionDate).getDate();
    sessionIntensity[d] = (sessionIntensity[d] ?? 0) + 1;
  });

  // ── Weekly bars (4 weeks) ────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(year, month);
  const weeklyData = [0, 0, 0, 0, 0];
  monthSessions.forEach((s) => {
    const day = new Date(s.sessionDate).getDate();
    const week = Math.min(Math.floor((day - 1) / 7), 4);
    weeklyData[week] += s.duration / 60; // minutes
  });

  // ── Daily bars for tasks ─────────────────────────────────────────────────
  const dailyTaskData: number[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return monthTasks.filter((t) => {
      const d = new Date(t.createdAt);
      return d.getDate() === day && t.status === "completed";
    }).length;
  });

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    const n = new Date();
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth())) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const canGoNext = !(year === now.getFullYear() && month >= now.getMonth());

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={22} color="#F1F5F9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Picker */}
      <View style={styles.monthPicker}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={[styles.monthArrow, !canGoNext && { opacity: 0.3 }]} disabled={!canGoNext}>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3B82F6" size="large" />
          <Text style={styles.loadingText}>Crunching your data…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Ring Summary Row ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Month at a Glance</Text>
            <View style={styles.ringRow}>
              <RadialRing
                value={monthSessions.length}
                max={Math.max(monthSessions.length, 20)}
                color="#3B82F6"
                label="Sessions"
                sublabel="total"
              />
              <RadialRing
                value={completedTasks + completedDefault}
                max={Math.max(monthTasks.length + totalDefault, 10)}
                color="#10B981"
                label="Tasks Done"
                sublabel="done"
              />
              <RadialRing
                value={totalComforts}
                max={Math.max(totalComforts, 10)}
                color="#F472B6"
                label="Comforts"
                sublabel="added"
              />
            </View>
          </View>

          {/* ── Timer / Session Stats ────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={styles.cardLabel}>Daydream Sessions</Text>
            </View>

            <View style={styles.pillRow}>
              <StatPill icon="time-outline" label="Total Time" value={fmtDuration(totalDuration)} color="#3B82F6" />
              <StatPill icon="analytics-outline" label="Avg Session" value={fmtDuration(avgDuration)} color="#60A5FA" />
              <StatPill icon="trending-up-outline" label="Longest" value={fmtDuration(longestSession)} color="#A78BFA" />
            </View>

            {/* Weekly bars */}
            {monthSessions.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.subLabel}>Weekly Duration (min)</Text>
                <View style={{ marginTop: 8 }}>
                  <SparkBars data={weeklyData} color="#3B82F6" height={56} />
                  <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 6 }}>
                    {["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5"].map((w) => (
                      <Text key={w} style={{ fontSize: 9, color: "#4B5563", fontWeight: "600" }}>{w}</Text>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Session heatmap */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.subLabel}>Session Frequency</Text>
              <View style={{ marginTop: 10 }}>
                <DayHeatmap
                  year={year}
                  month={month}
                  activeDays={new Set(Object.keys(sessionIntensity).map(Number))}
                  intensityMap={sessionIntensity}
                  color="#3B82F6"
                />
              </View>
            </View>
          </View>

          {/* ── Emotions ─────────────────────────────────────────────────── */}
          {monthSessions.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardDot, { backgroundColor: "#F472B6" }]} />
                <Text style={styles.cardLabel}>Emotional Patterns</Text>
              </View>
              <EmotionBreakdown sessions={monthSessions} />
            </View>
          )}

          {/* ── Task Completion ───────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.cardLabel}>Task Completion</Text>
            </View>

            <View style={styles.pillRow}>
              <StatPill icon="checkmark-circle-outline" label="Completed" value={`${completedTasks}`} color="#10B981" />
              <StatPill icon="list-outline" label="Total Tasks" value={`${monthTasks.length}`} color="#34D399" />
              <StatPill icon="pie-chart-outline" label="Rate" value={`${taskCompletionRate}%`} color="#6EE7B7" />
            </View>

            {/* Daily completions bar chart */}
            {dailyTaskData.some((v) => v > 0) && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.subLabel}>Daily Completions</Text>
                <View style={{ marginTop: 8 }}>
                  <SparkBars data={dailyTaskData} color="#10B981" height={48} />
                </View>
              </View>
            )}

            {/* Daily practice progress */}
            {totalDefault > 0 && (
              <View style={styles.practiceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>Daily Practices</Text>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {completedDefault} of {totalDefault} completed today
                  </Text>
                </View>
                <View style={styles.practiceRing}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#10B981" }}>
                    {totalDefault > 0 ? Math.round((completedDefault / totalDefault) * 100) : 0}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Comfort Corner ───────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardDot, { backgroundColor: "#F472B6" }]} />
              <Text style={styles.cardLabel}>Comfort Corner</Text>
            </View>

            <View style={styles.pillRow}>
              <StatPill icon="heart-outline" label="My Comforts" value={`${totalComforts}`} color="#F472B6" />
            </View>

            {totalComforts > 0 && (
              <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(data?.userComforts ?? []).slice(0, 8).map((c) => (
                  <View key={c._id} style={styles.comfortChip}>
                    <Text style={{ fontSize: 14 }}>{c.icon}</Text>
                    <Text style={styles.comfortChipText}>{c.title}</Text>
                  </View>
                ))}
                {totalComforts > 8 && (
                  <View style={styles.comfortChip}>
                    <Text style={styles.comfortChipText}>+{totalComforts - 8} more</Text>
                  </View>
                )}
              </View>
            )}

            {totalComforts === 0 && (
              <Text style={styles.emptyNote}>No personal comforts added yet.</Text>
            )}
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 12, padding: 32,
  },
  loadingText: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  errorText: { fontSize: 13, color: "#EF4444", textAlign: "center" },
  retryBtn: {
    backgroundColor: "#3B82F6", paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  // Header
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#F1F5F9", letterSpacing: -0.3 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1F2937",
    alignItems: "center", justifyContent: "center",
  },

  // Month picker
  monthPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  monthArrow: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#1F2937",
    alignItems: "center", justifyContent: "center",
  },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#F1F5F9", minWidth: 90, textAlign: "center" },

  // Scroll
  scrollContent: { padding: 16, gap: 16 },

  // Cards
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardLabel: {
    fontSize: 11, fontWeight: "700",
    letterSpacing: 1.3, textTransform: "uppercase",
    color: "#6B7280",
  },
  subLabel: {
    fontSize: 10, fontWeight: "700",
    letterSpacing: 1, textTransform: "uppercase",
    color: "#4B5563",
  },

  // Ring row
  ringRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    paddingBottom: 4,
  },

  // Stat pills
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    minWidth: 90,
  },
  statPillIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  statPillValue: { fontSize: 15, fontWeight: "800", color: "#F1F5F9" },
  statPillLabel: { fontSize: 9, color: "#6B7280", fontWeight: "600", letterSpacing: 0.5 },

  // Practice
  practiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  practiceRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 2, borderColor: "rgba(16,185,129,0.3)",
    alignItems: "center", justifyContent: "center",
  },

  // Comforts
  comfortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(244,114,182,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,114,182,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  comfortChipText: { fontSize: 12, fontWeight: "600", color: "#E5E7EB" },

  emptyNote: { fontSize: 13, color: "#4B5563", textAlign: "center", paddingVertical: 12 },
});
