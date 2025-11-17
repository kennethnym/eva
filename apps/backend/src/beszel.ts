import { Hono } from "hono"
import { type BeszelContext, beszelAuth } from "./beszel/middleware"

const beszel = new Hono<BeszelContext>()

// Apply middleware to all beszel routes
beszel.use("*", beszelAuth())

interface BeszelSystemInfo {
	name: string
	status: "up" | "down"
	info: {
		cpu: number
		ram: number
		disk: number
	}
}

interface BeszelApiSystem {
	name: string
	status: "up" | "down"
	info: {
		cpu: number
		mp: number // memory percentage
		dp: number // disk percentage
	}
}

beszel.get("/systems", async (c) => {
	try {
		const beszelHost = process.env.BESZEL_HOST
		const token = c.get("beszelToken")

		if (!beszelHost) {
			console.error("[Beszel API] BESZEL_HOST environment variable not set")
			return c.json({ error: "BESZEL_HOST environment variable not set" }, 500)
		}

		const response = await fetch(`http://${beszelHost}/api/collections/systems/records`, {
			headers: {
				Authorization: token,
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error(
				`[Beszel API] Failed to fetch systems: ${response.status} ${response.statusText}`,
				errorText ? `- ${errorText}` : "",
			)
			
			return new Response(
				JSON.stringify({
					error: "Failed to fetch Beszel data",
					status: response.status,
					statusText: response.statusText,
				}),
				{
					status: response.status,
					headers: { "Content-Type": "application/json" },
				},
			)
		}

		const data = (await response.json()) as { items: BeszelApiSystem[] }

		const systems: BeszelSystemInfo[] = data.items.map((system) => ({
			name: system.name,
			status: system.status,
			info: {
				cpu: system.info.cpu,
				ram: system.info.mp,
				disk: system.info.dp,
			},
		}))

		console.log(`[Beszel API] Successfully fetched ${systems.length} systems`)

		return c.json({
			lastUpdated: new Date().toISOString(),
			systems,
			totalSystems: systems.length,
		})
	} catch (error) {
		console.error("[Beszel API] Internal server error:", error)
		return c.json({ error: "Internal server error", message: String(error) }, 500)
	}
})

export default beszel
