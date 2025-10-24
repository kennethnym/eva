/**
 * Simple in-memory cache for shortened disruption descriptions
 */

interface CacheEntry {
	shortened: string
	timestamp: number
}

const cache = new Map<string, CacheEntry>()

// Cache for 1 hour
const CACHE_DURATION = 60 * 60 * 1000

/**
 * Get cached shortened description
 */
export function getCachedShortened(originalReason: string): string | null {
	const entry = cache.get(originalReason)
	
	if (!entry) {
		return null
	}
	
	// Check if expired
	if (Date.now() - entry.timestamp > CACHE_DURATION) {
		cache.delete(originalReason)
		return null
	}
	
	return entry.shortened
}

/**
 * Cache a shortened description
 */
export function setCachedShortened(originalReason: string, shortened: string): void {
	cache.set(originalReason, {
		shortened,
		timestamp: Date.now(),
	})
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
	const now = Date.now()
	for (const [key, entry] of cache.entries()) {
		if (now - entry.timestamp > CACHE_DURATION) {
			cache.delete(key)
		}
	}
}

// Clear expired entries every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000)
