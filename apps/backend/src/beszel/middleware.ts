import type { MiddlewareHandler } from "hono"

interface BeszelAuthResponse {
	token: string
}

export function beszelAuth(): MiddlewareHandler {
	let cachedToken: string | null = null

	const authenticate = async (): Promise<string> => {
		if (cachedToken) {
			return cachedToken
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
			throw new Error(`Beszel authentication failed: ${response.status}`)
		}

		const data = (await response.json()) as BeszelAuthResponse
		cachedToken = data.token

		return cachedToken
	}

	return async (c, next) => {
		try {
			const token = await authenticate()
			c.set("beszelToken", token)
			await next()
		} catch (error) {
			return c.json({ error: "Authentication failed", message: String(error) }, 500)
		}
	}
}

export type BeszelContext = {
	Variables: {
		beszelToken: string
	}
}
