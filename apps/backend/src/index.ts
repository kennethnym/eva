import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { serveStatic } from "hono/bun"
import weather from "./weather"
import tfl from "./tfl"
import beszel from "./beszel"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())

app.get("/api/health", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// Mount weather routes
app.route("/api/weather", weather)

// Mount TfL routes
app.route("/api/tfl", tfl)

// Mount Beszel routes
app.route("/api/beszel", beszel)

// Serve static files from dashboard build
app.use("/*", serveStatic({ root: "../dashboard/dist" }))

// Fallback to index.html for client-side routing
app.get("*", serveStatic({ path: "../dashboard/dist/index.html" }))

export default {
	port: 8000,
	fetch: app.fetch,
}
