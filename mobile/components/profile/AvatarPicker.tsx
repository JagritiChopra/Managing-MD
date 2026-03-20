// components/profile/AvatarPicker.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Displays the current avatar, lets user pick a new one from their gallery,
// and uploads it to PUT /api/profile/avatar (multipart/form-data).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.161.214.108:5000/api";

interface Props {
  uri: string;            // current avatar URL
  onUpdated: (newUri: string) => void;
}

export default function AvatarPicker({ uri, onUpdated }: Props) {
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to change your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const form = new FormData();
      form.append("avatar", {
        uri: asset.uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");

      onUpdated(data.data.avatar);
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  const defaultAvatar = require("../../assets/images/icon.png"); // fallback

  return (
    <View style={styles.wrapper}>
      <View style={styles.ring}>
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <Image source={defaultAvatar} style={styles.avatar} />
        )}
      </View>

      <TouchableOpacity
        style={styles.editBadge}
        onPress={pick}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="pencil" size={14} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignSelf: "center",
    marginBottom: 16,
  },
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#3B82F6",
    overflow: "hidden",
    backgroundColor: "#1F2937",
  },
  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#3B82F6",
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0B1220",
  },
});