/**
 * Simple in-memory cache for AI weather descriptions
 * Cache expires after 1 hour
 */

interface CacheEntry {
  description: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Generate cache key from coordinates
 */
function getCacheKey(lat: string, lon: string): string {
  // Round to 2 decimal places to group nearby locations
  const roundedLat = Math.round(parseFloat(lat) * 100) / 100;
  const roundedLon = Math.round(parseFloat(lon) * 100) / 100;
  return `${roundedLat},${roundedLon}`;
}

/**
 * Get cached description if available and not expired
 */
export function getCachedDescription(lat: string, lon: string): string | null {
  const key = getCacheKey(lat, lon);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    // Expired, remove from cache
    cache.delete(key);
    return null;
  }

  return entry.description;
}

/**
 * Store description in cache
 */
export function setCachedDescription(lat: string, lon: string, description: string): void {
  const key = getCacheKey(lat, lon);
  cache.set(key, {
    description,
    timestamp: Date.now(),
  });
}

/**
 * Clear all cached descriptions (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, entry]) => ({
      location: key,
      age: Math.round((Date.now() - entry.timestamp) / 1000 / 60), // minutes
    })),
  };
}
