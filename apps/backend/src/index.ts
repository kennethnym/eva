import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import weather from "./weather"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())

app.get("/", (c) => {
	return c.json({ message: "Hello from Bun + Hono!" })
})

app.get("/api/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Mount weather routes
app.route("/api/weather", weather)

export default {
	port: 8000,
	fetch: app.fetch,
}
