import { Hono } from "hono"
import { upgradeWebSocket } from "hono/bun"
import type { WSContext } from "hono/ws"
import type { MqttClient } from "mqtt"
import type { ZigbeeController } from "./controller"
import { type ZigbeeContext, zigbeeController } from "./middleware"
import { WebSocketHandler } from "./ws"

export function zigbee(mqtt: MqttClient) {
	const h = new Hono<ZigbeeContext>()

	h.use("*", zigbeeController(mqtt))

	h.get(
		"/",
		upgradeWebSocket((c) => {
			const controller = c.get("zigbeeController") as ZigbeeController
			const wsHandler = new WebSocketHandler(controller)
			return {
				onOpen: (event, ws) => {
					wsHandler.handleWebsocketOpen(event, ws)
				},
				onMessage: (event, ws) => {
					wsHandler.handleWebsocketMessage(event, ws)
				},
				onClose: (event, ws) => {
					wsHandler.handleWebsocketClose(ws)
				},
			}
		}),
	)

	return h
}

export default zigbee
