// hooks/useTabData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic CRUD hook used by all 4 data tabs (home, journal, comfort, timer).
// Each tab calls this once on mount. Handles fetch, create, update, delete
// with optimistic local state so the UI never waits for the server.
//
// Handles both backend response shapes:
//   paginatedResponse → { success, data: [...], pagination: {} }
//   successResponse   → { success, data: { [key]: {...} } }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { apiRequest } from "../services/api";

interface UseTabDataOptions<T> {
  endpoint: string;                // e.g. "/journal"
  responseKey: string;             // key inside data.data — e.g. "entries"
  idField?: string;                // default "_id"
  fetchOnMount?: boolean;          // default true
  params?: Record<string, string>; // query params for initial fetch
}

interface TabDataState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (body: Partial<T>) => Promise<T>;
  update: (id: string, body: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  customRequest: (endpoint: string, method: string, body?: unknown) => Promise<any>;
}

// Derive singular key:  "entries" → "entry",  "sessions" → "session"
function toSingular(key: string): string {
  if (key.endsWith("ies")) return key.slice(0, -3) + "y";
  if (key.endsWith("s"))   return key.slice(0, -1);
  return key;
}

// Extract array from either response shape
function extractArray<T>(data: any, responseKey: string): T[] {
  // paginatedResponse: { success, data: [...], pagination }
  if (Array.isArray(data?.data)) return data.data as T[];
  // successResponse:  { success, data: { [responseKey]: [...] } }
  if (Array.isArray(data?.data?.[responseKey])) return data.data[responseKey] as T[];
  if (Array.isArray(data?.[responseKey])) return data[responseKey] as T[];
  if (Array.isArray(data?.data?.items))   return data.data.items as T[];
  return [];
}

// Extract single item from successResponse
function extractItem<T>(data: any, responseKey: string): T | null {
  const singularKey = toSingular(responseKey);

  // { data: { journal: {...} } }
  if (data?.data?.[singularKey] && typeof data.data[singularKey] === "object")
    return data.data[singularKey] as T;

  // { data: { comfort: {...} } } — try plural key (non-array)
  if (
    data?.data?.[responseKey] &&
    typeof data.data[responseKey] === "object" &&
    !Array.isArray(data.data[responseKey])
  )
    return data.data[responseKey] as T;

  // paginatedResponse first item
  if (Array.isArray(data?.data) && data.data[0]) return data.data[0] as T;

  return null;
}

export function useTabData<T extends { _id?: string; [key: string]: any }>({
  endpoint,
  responseKey,
  idField = "_id",
  fetchOnMount = true,
  params,
}: UseTabDataOptions<T>): TabDataState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = (base: string, p?: Record<string, string>) => {
    if (!p || !Object.keys(p).length) return base;
    return `${base}?${new URLSearchParams(p).toString()}`;
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const paramsKey = params ? JSON.stringify(params) : "";

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest(buildUrl(endpoint, params), "GET", undefined, true);
      setItems(extractArray<T>(data, responseKey));
    } catch (e: any) {
      setError(e.message ?? "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, responseKey, paramsKey]);

  useEffect(() => {
    if (fetchOnMount) refresh();
  }, [fetchOnMount]);

  // ── Create ────────────────────────────────────────────────────────────────
  const create = useCallback(
    async (body: Partial<T>): Promise<T> => {
      const data = await apiRequest(endpoint, "POST", body, true);
      const newItem = extractItem<T>(data, responseKey);

      if (!newItem) {
        // Response shape unrecognised — refetch to stay in sync
        await refresh();
        return body as T;
      }

      setItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    [endpoint, responseKey, refresh]
  );

  // ── Update (optimistic) ───────────────────────────────────────────────────
  const update = useCallback(
    async (id: string, body: Partial<T>): Promise<T> => {
      setItems((prev) =>
        prev.map((item) => (item[idField] === id ? { ...item, ...body } : item))
      );
      try {
        const data = await apiRequest(`${endpoint}/${id}`, "PUT", body, true);
        const updated = extractItem<T>(data, responseKey);
        if (updated) {
          setItems((prev) =>
            prev.map((item) => (item[idField] === id ? updated : item))
          );
          return updated;
        }
        return body as T;
      } catch (e: any) {
        await refresh();
        throw e;
      }
    },
    [endpoint, responseKey, idField, refresh]
  );

  // ── Delete (optimistic) ───────────────────────────────────────────────────
  const remove = useCallback(
    async (id: string): Promise<void> => {
      let previous: T[] = [];
      setItems((prev) => {
        previous = prev;
        return prev.filter((item) => item[idField] !== id);
      });
      try {
        await apiRequest(`${endpoint}/${id}`, "DELETE", undefined, true);
      } catch (e: any) {
        setItems(previous);
        throw e;
      }
    },
    [endpoint, idField]
  );

  // ── Custom ────────────────────────────────────────────────────────────────
  const customRequest = useCallback(
    async (ep: string, method: string, body?: unknown) => {
      return await apiRequest(ep, method, body, true);
    },
    []
  );

  return { items, isLoading, error, refresh, create, update, remove, customRequest };
}