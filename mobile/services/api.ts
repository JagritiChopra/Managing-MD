// services/api.ts
import * as SecureStore from "expo-secure-store";

// Set EXPO_PUBLIC_API_URL in your .env to override (e.g. for local dev).
// Falls back to the production URL.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://managing-maladaptive-daydreaming.onrender.com/api";

export async function apiRequest(
  endpoint: string,
  method = "GET",
  body?: unknown,
  requiresAuth = false
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (requiresAuth) {
    const token = await SecureStore.getItemAsync("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}