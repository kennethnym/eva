import { Hono } from "hono"
import { serveStatic, websocket } from "hono/bun"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import beszel from "./beszel"
import { createMqttClient } from "./mqtt"
import tfl from "./tfl"
import weather from "./weather"
import zigbee from "./zigbee/routes"

const mqtt = await createMqttClient({
	host: process.env.MQTT_HOST,
	port: process.env.MQTT_PORT,
	username: process.env.MQTT_USERNAME,
	password: process.env.MQTT_PASSWORD,
})

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

// Mount Zigbee routes
app.route("/api/zigbee", zigbee(mqtt))

// Serve static files from dashboard build
app.use("/*", serveStatic({ root: "../dashboard/dist" }))

// Fallback to index.html for client-side routing
app.get("*", serveStatic({ path: "../dashboard/dist/index.html" }))

export default {
	port: 8000,
	fetch: app.fetch,
	websocket,
}
