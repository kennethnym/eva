import type { ZigbeeDeviceName, ZigbeeDeviceStates } from "@eva/zigbee"

export type JrpcSchema = {
	subscribeToDevice: {
		Params: {
			deviceName: ZigbeeDeviceName
		}
		Response: true
	}
	setDeviceState: {
		Params: {
			deviceName: ZigbeeDeviceName
			state: unknown
		}
		Response: true
	}
	showDeviceState: {
		Params: {
			[key in ZigbeeDeviceName]: {
				deviceName: key
				state: ZigbeeDeviceStates[key]
			}
		}[ZigbeeDeviceName]
		Response: true
	}
}

export type JrpcRequest<Method extends keyof JrpcSchema = keyof JrpcSchema> = {
	[M in keyof JrpcSchema]: {
		id: string
		jsonrpc: "2.0"
		method: M
		params: JrpcSchema[M]["Params"]
	}
}[Method]

export type JrpcResponse<Method extends keyof JrpcSchema = keyof JrpcSchema> = {
	[M in keyof JrpcSchema]:
		| {
				id: string
				jsonrpc: "2.0"
				result: JrpcSchema[M]["Response"]
		  }
		| {
				id: string
				jsonrpc: "2.0"
				error: string
		  }
}[Method]
