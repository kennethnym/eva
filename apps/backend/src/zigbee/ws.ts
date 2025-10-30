import { type JrpcRequest, type JrpcResponse, newJrpcRequestId } from "@eva/jrpc"
import { ALL_ZIGBEE_DEVICE_NAMES, type ZigbeeDeviceName, type ZigbeeDeviceState } from "@eva/zigbee"
import type { WSContext } from "hono/ws"
import type { DeviceMessageListener, ZigbeeController } from "./controller"

export class WebSocketHandler {
	private deviceListeners: Map<ZigbeeDeviceName, DeviceMessageListener> = new Map()

	constructor(private readonly controller: ZigbeeController) {}

	handleWebsocketOpen(_event: Event, ws: WSContext) {
		for (const device of ALL_ZIGBEE_DEVICE_NAMES) {
			const l: DeviceMessageListener = (msg) => {
				const state = msg as ZigbeeDeviceState<typeof device>
				const request: JrpcRequest<"showDeviceState"> = {
					id: newJrpcRequestId(),
					jsonrpc: "2.0",
					method: "showDeviceState",
					params: { deviceName: device, state } as {
						[K in ZigbeeDeviceName]: { deviceName: K; state: ZigbeeDeviceState<K> }
					}[ZigbeeDeviceName],
				}
				ws.send(JSON.stringify(request))
			}
			this.controller.subscribeToDevice(device, l)
			this.deviceListeners.set(device, l)
		}
	}

	async handleWebsocketMessage(event: MessageEvent, ws: WSContext) {
		const message = JSON.parse(event.data) as JrpcRequest | JrpcResponse
		if ("method" in message) {
			await this.handleRequest(message, ws)
		}
	}

	handleWebsocketClose(_ws: WSContext) {
		for (const [device, listener] of this.deviceListeners.entries()) {
			this.controller.unsubscribeFromDevice(device, listener)
		}
	}

	private async handleRequest(message: JrpcRequest, ws: WSContext) {
		switch (message.method) {
			case "setDeviceState": {
				await this.controller.setDeviceState(message.params.deviceName, message.params.state)
				const response: JrpcResponse<"setDeviceState"> = {
					id: message.id,
					jsonrpc: "2.0",
					result: true,
				}
				ws.send(JSON.stringify(response))
			}
		}
	}
}
