import type { ZigbeeDeviceName } from "@eva/zigbee"
import type { MqttClient } from "mqtt"

export type DeviceMessageListener = (msg: unknown) => void

export class ZigbeeController {
	private deviceListeners: Map<string, DeviceMessageListener[]> = new Map()

	constructor(
		private readonly baseTopic: string,
		private readonly mqtt: MqttClient,
	) {
		this.mqtt.on("message", (topic, message) => {
			const [baseTopic, deviceName] = topic.split("/")
			if (baseTopic !== this.baseTopic) {
				return
			}
			const listeners = this.deviceListeners.get(deviceName)
			if (listeners) {
				for (const listener of listeners) {
					listener(JSON.parse(message.toString()))
				}
			}
		})
	}

	async subscribeToDevice(deviceName: ZigbeeDeviceName, listener: DeviceMessageListener): Promise<void> {
		await this.mqtt.publishAsync(`${this.baseTopic}/${deviceName}/get`, JSON.stringify({ state: {} }))
		await this.mqtt.subscribeAsync(`${this.baseTopic}/${deviceName}`)
		if (!this.deviceListeners.has(deviceName)) {
			this.deviceListeners.set(deviceName, [])
		}
		this.deviceListeners.get(deviceName)?.push(listener)
	}

	async unsubscribeFromDevice(deviceName: ZigbeeDeviceName, listener: DeviceMessageListener): Promise<void> {
		await this.mqtt.unsubscribeAsync(`${this.baseTopic}/${deviceName}`)
		const listeners = this.deviceListeners.get(deviceName)
		if (listeners) {
			listeners.splice(listeners.indexOf(listener), 1)
			if (listeners.length === 0) {
				this.deviceListeners.delete(deviceName)
			}
		}
	}

	async setDeviceState(deviceName: ZigbeeDeviceName, state: unknown): Promise<void> {
		await this.mqtt.publishAsync(`${this.baseTopic}/${deviceName}/set`, JSON.stringify(state))
	}
}
