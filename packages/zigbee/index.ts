export const ZIGBEE_BASE_TOPIC = "nexus"

export const ZIGBEE_DEVICE = {
	deskLamp: "desk_lamp",
	livingRoomFloorLamp: "living_room_floor_lamp",
} as const
export type ZigbeeDeviceName = (typeof ZIGBEE_DEVICE)[keyof typeof ZIGBEE_DEVICE]

export type ZigbeeDeviceStates = {
	[ZIGBEE_DEVICE.deskLamp]: {
		state: "ON" | "OFF"
		brightness: number
	}
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: {
		brightness: number
		level_config: {
			on_level: "previous"
		}
		linkquality: number
		state: "ON" | "OFF"
		update: {
			installed_version: number
			latest_version: number
			state: "available" | "idle"
		}
	}
}

export const ALL_ZIGBEE_DEVICE_NAMES: ZigbeeDeviceName[] = Object.values(ZIGBEE_DEVICE)

export type ZigbeeDeviceState = ZigbeeDeviceStates[keyof ZigbeeDeviceStates]
