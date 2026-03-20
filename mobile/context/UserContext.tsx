// context/UserContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the logged-in user's data.
// Fetch ONCE on mount (after auth confirms a token exists).
// All 5 tabs read from here — no tab ever calls /api/profile independently.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiRequest } from "../services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  dob: string | null;       // ISO string or null
  address: string;
  goal: string;
  why: string;
  avatar: string;
  isVerified: boolean;
  createdAt: string;
}

interface UserContextState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  /** Call once after login — fetches and caches the full profile */
  fetchUser: () => Promise<void>;
  /** Optimistically update local state + persist to backend */
  updateUser: (fields: Partial<UserProfile>) => Promise<void>;
  /** Wipe local state on logout */
  clearUser: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextState | null>(null);

export function UserProvider({
  children,
  token,                   // pass the auth token so we know when to fetch
}: {
  children: React.ReactNode;
  token: string | null;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch profile (called once after login) ───────────────────────────────
  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest("/profile", "GET", undefined, true);
      setUser(data.data.user);
    } catch (err: any) {
      setError(err.message ?? "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Update (optimistic) ───────────────────────────────────────────────────
  const updateUser = useCallback(
    async (fields: Partial<UserProfile>) => {
      // 1. Optimistically update UI immediately
      setUser((prev) => (prev ? { ...prev, ...fields } : prev));
      try {
        // 2. Persist to backend
        const data = await apiRequest("/profile", "PUT", fields, true);
        // 3. Sync with server response (in case backend trims/transforms values)
        setUser(data.data.user);
      } catch (err: any) {
        // 4. On error, refetch to revert to true state
        setError(err.message ?? "Update failed");
        fetchUser();
        throw err; // so the calling screen can show an error toast
      }
    },
    [fetchUser]
  );

  // ── Clear on logout ───────────────────────────────────────────────────────
  const clearUser = useCallback(() => {
    setUser(null);
    setError(null);
  }, []);

  // ── Auto-fetch when token appears (login) ─────────────────────────────────
  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
    if (!token) {
      clearUser();
    }
  }, [token]);

  return (
    <UserContext.Provider
      value={{ user, isLoading, error, fetchUser, updateUser, clearUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within <UserProvider>");
  return ctx;
}