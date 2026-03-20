// app/(tabs)/profile.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Reads user data from UserContext (fetched ONCE at login).
// All edits call updateUser() → optimistic local update + PUT /api/profile.
// No direct API calls from this file.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../context/UserContext";
import EditableField from "../../components/profile/EditableField";
import AvatarPicker from "../../components/profile/AvatarPicker";
import ChangePasswordModal from "../../components/profile/ChangePasswordModal";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user, isLoading, error, updateUser, fetchUser } = useUser();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  };

  // ── Generic field saver (returns a stable function per field key) ─────────
  const save = (key: string) => async (value: string) => {
    await updateUser({ [key]: value } as any);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading && !user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" size="large" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  if (error && !user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUser}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user?.name ?? "—";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formattedDob = user?.dob
    ? new Date(user.dob).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "";

  return (
    <View style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setShowPasswordModal(true)}
        >
          <Ionicons name="settings-outline" size={20} color="#F1F5F9" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* ── Avatar + Name ───────────────────────────────────────────────── */}
        <AvatarPicker
          uri={user?.avatar ?? ""}
          onUpdated={(newUri) => updateUser({ avatar: newUri })}
        />
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userSubtitle}>Mindfulness Explorer</Text>

        {/* ── Progress Card ───────────────────────────────────────────────── */}
        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>Current Progress</Text>
            <Text style={styles.progressValue}>Stage 1</Text>
          </View>
          <TouchableOpacity style={styles.analyticsLink}>
            <Text style={styles.analyticsText}>View Analytics</Text>
            <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* ── Personal Information ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.card}>
          <EditableField
            label="Full Name"
            value={user?.name ?? ""}
            onSave={save("name")}
            placeholder="Enter your full name"
            maxLength={100}
          />
          <EditableField
            label="Email"
            value={user?.email ?? ""}
            onSave={save("email")}
            keyboardType="email-address"
            placeholder="Enter your email"
          />
          <EditableField
            label="Date of Birth"
            value={formattedDob}
            onSave={async (val) => {
              // Accept YYYY-MM-DD or common formats
              const parsed = new Date(val);
              if (isNaN(parsed.getTime())) throw new Error("Use YYYY-MM-DD format");
              await updateUser({ dob: parsed.toISOString().split("T")[0] });
            }}
            placeholder="YYYY-MM-DD"
          />
          <EditableField
            label="Address"
            value={user?.address ?? ""}
            onSave={save("address")}
            placeholder="City, Country"
            maxLength={300}
          />
        </View>

        {/* ── Life Direction ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Life Direction</Text>
        <View style={styles.card}>
          <EditableField
            label="My Goal"
            value={user?.goal ?? ""}
            onSave={save("goal")}
            multiline
            placeholder="What do you want to achieve?"
            maxLength={500}
          />
          <EditableField
            label="Why I want to overcome MD"
            value={user?.why ?? ""}
            onSave={save("why")}
            multiline
            placeholder="Your reason keeps you going…"
            maxLength={500}
          />
        </View>

        {/* ── Emergency Help ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Emergency Help</Text>
        <View style={styles.crisisCard}>
          <View style={styles.crisisIconWrap}>
            <Ionicons name="medkit" size={22} color="#fff" />
          </View>
          <View style={styles.crisisContent}>
            <Text style={styles.crisisTitle}>Crisis Resources</Text>
            <Text style={styles.crisisDesc}>
              If you or someone you know is in immediate danger, please reach out.
            </Text>
            <View style={styles.crisisBtns}>
              <TouchableOpacity style={styles.callBtn}>
                <Text style={styles.callBtnText}>Call 988</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn}>
                <Text style={styles.textBtnText}>Text Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Sign Out ────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  centered: {
    flex: 1,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#0B1220",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F1F5F9",
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Name / subtitle
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F1F5F9",
    textAlign: "center",
    marginTop: 8,
  },
  userSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 20,
  },

  // Progress card
  progressCard: {
    backgroundColor: "rgba(250,204,20,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#3B82F6",
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F1F5F9",
  },
  analyticsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  analyticsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3B82F6",
  },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 10,
    marginTop: 4,
    paddingLeft: 2,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
    marginBottom: 24,
  },

  // Crisis
  crisisCard: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  crisisIconWrap: {
    backgroundColor: "#EF4444",
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  crisisContent: { flex: 1 },
  crisisTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  crisisDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 18,
  },
  crisisBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  callBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  textBtn: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  textBtnText: {
    color: "#F1F5F9",
    fontWeight: "700",
    fontSize: 13,
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.06)",
    marginBottom: 8,
  },
  signOutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 15,
  },
});