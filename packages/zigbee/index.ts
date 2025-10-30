export const ZIGBEE_BASE_TOPIC = "nexus"

export const ZIGBEE_DEVICE = {
	deskLamp: "desk_lamp",
	livingRoomFloorLamp: "living_room_floor_lamp",
} as const

export type ZigbeeDeviceStates = {
	[ZIGBEE_DEVICE.deskLamp]: {
		state: "ON" | "OFF"
		brightness: number
	}
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: {
		brightness: number
		state: "ON" | "OFF"
	}
}

export type ZigbeeDeviceName = keyof ZigbeeDeviceStates

export type ZigbeeDeviceState<DeviceName extends ZigbeeDeviceName = ZigbeeDeviceName> = ZigbeeDeviceStates[DeviceName]

export const ALL_ZIGBEE_DEVICE_NAMES: ZigbeeDeviceName[] = Object.values(ZIGBEE_DEVICE)
