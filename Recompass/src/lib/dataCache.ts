// SWR (Stale-While-Revalidate) In-Memory & LocalStorage Client Cache for Recompass
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_PREFIX = "recompass_cache_";

export function getCachedData<T>(key: string, maxAgeMs = 1000 * 60 * 30): T | null {
  // 1. Check in-memory cache first (instant)
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < maxAgeMs) {
    return mem.data as T;
  }

  // 2. Check localStorage (fast sync)
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (Date.now() - parsed.timestamp < maxAgeMs || !maxAgeMs)) {
        memoryCache.set(key, { data: parsed.data, timestamp: parsed.timestamp });
        return parsed.data as T;
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }

  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  const timestamp = Date.now();
  memoryCache.set(key, { data, timestamp });
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp }));
  } catch (e) {
    // Quota exceeded or private browsing
  }
}

export function clearCachedData(key: string): void {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (e) {
    // Ignore
  }
}
