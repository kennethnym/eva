import { ZIGBEE_BASE_TOPIC } from "@eva/zigbee"
import { createMiddleware } from "hono/factory"
import type { MqttClient } from "mqtt"
import { ZigbeeController } from "./controller"

export function zigbeeController(mqtt: MqttClient) {
	const controller = new ZigbeeController(ZIGBEE_BASE_TOPIC, mqtt)
	return createMiddleware((c, next) => {
		c.set("zigbeeController", controller)
		return next()
	})
}

export type ZigbeeContext = {
	Variables: {
		zigbeeController: ZigbeeController
	}
}
