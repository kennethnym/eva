import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import weather from "./weather"
import tfl from "./tfl"
import beszel from "./beszel"

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

// Mount TfL routes
app.route("/api/tfl", tfl)

// Mount Beszel routes
app.route("/api/beszel", beszel)

export default {
	port: 8000,
	fetch: app.fetch,
}
