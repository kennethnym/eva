import type { MiddlewareHandler } from "hono"

interface BeszelAuthResponse {
	token: string
}

export function beszelAuth(): MiddlewareHandler {
	let cachedToken: string | null = null
	let tokenExpiry: number | null = null
	
	// Token lifetime: 50 minutes (tokens typically expire after 1 hour, refresh before that)
	const TOKEN_LIFETIME_MS = 50 * 60 * 1000

	const authenticate = async (): Promise<string> => {
		const now = Date.now()
		
		// Return cached token if it exists and hasn't expired
		if (cachedToken && tokenExpiry && now < tokenExpiry) {
			return cachedToken
		}

		// Log re-authentication for debugging
		if (cachedToken && tokenExpiry && now >= tokenExpiry) {
			console.log("[Beszel Auth] Token expired, re-authenticating...")
		} else {
			console.log("[Beszel Auth] Initial authentication...")
		}

		const beszelHost = process.env.BESZEL_HOST
		const beszelEmail = process.env.BESZEL_EMAIL
		const beszelPassword = process.env.BESZEL_PASSWORD

		if (!beszelHost || !beszelEmail || !beszelPassword) {
			throw new Error(
				"Beszel configuration missing. Set BESZEL_HOST, BESZEL_EMAIL, and BESZEL_PASSWORD environment variables.",
			)
		}

		const response = await fetch(`http://${beszelHost}/api/collections/users/auth-with-password`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				identity: beszelEmail,
				password: beszelPassword,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error(`[Beszel Auth] Authentication failed: ${response.status} - ${errorText}`)
			throw new Error(`Beszel authentication failed: ${response.status}`)
		}

		const data = (await response.json()) as BeszelAuthResponse
		cachedToken = data.token
		tokenExpiry = now + TOKEN_LIFETIME_MS

		console.log(`[Beszel Auth] Authentication successful, token valid until ${new Date(tokenExpiry).toISOString()}`)

		return cachedToken
	}

	return async (c, next) => {
		try {
			const token = await authenticate()
			c.set("beszelToken", token)
			await next()
		} catch (error) {
			console.error("[Beszel Auth] Middleware error:", error)
			return c.json({ error: "Authentication failed", message: String(error) }, 500)
		}
	}
}

export type BeszelContext = {
	Variables: {
		beszelToken: string
	}
}
