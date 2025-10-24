import type { MiddlewareHandler } from "hono"
import { generateWeatherKitToken } from "./auth"

interface TokenCache {
	token: string
	expiresAt: number
}

/**
 * Hono middleware that adds a WeatherKit token to the context.
 * The token is automatically cached and refreshed before expiration.
 *
 * Usage:
 * ```typescript
 * import { weatherKitAuth } from "./weather-kit/middleware";
 *
 * app.use("/weather/*", weatherKitAuth());
 *
 * app.get("/weather/:lat/:lon", async (c) => {
 *   const token = c.get("weatherKitToken");
 *   // use token...
 * });
 * ```
 */
export function weatherKitAuth(): MiddlewareHandler {
	let cache: TokenCache | null = null

	const getOrRefreshToken = async (): Promise<string> => {
		const now = Math.floor(Date.now() / 1000)
		const bufferTime = 300 // 5 minutes buffer before expiration

		// Return cached token if still valid
		if (cache && cache.expiresAt > now + bufferTime) {
			return cache.token
		}

		// Generate new token
		const expiresIn = 3600 // 1 hour
		const token = await generateWeatherKitToken({
			teamId: process.env.ADP_TEAM_ID,
			serviceId: process.env.ADP_SERVICE_ID,
			keyId: process.env.ADP_KEY_ID,
			privateKeyPath: process.env.ADP_KEY_PATH,
			expiresIn,
		})

		// Cache the token
		cache = {
			token,
			expiresAt: now + expiresIn,
		}

		return token
	}

	return async (c, next) => {
		const token = await getOrRefreshToken()
		c.set("weatherKitToken", token)
		await next()
	}
}

/**
 * Type helper for routes that use the weatherKitAuth middleware.
 * Adds type safety for the weatherKitToken context variable.
 */
export type WeatherKitContext = {
	Variables: {
		weatherKitToken: string
	}
}
