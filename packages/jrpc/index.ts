import type { ZigbeeDeviceName, ZigbeeDeviceStates } from "@eva/zigbee"
import { nanoid } from "nanoid"

export type JrpcRequestId = string & { __brand: "JrpcRequestId" }

export type JrpcSchema = {
	subscribeToDevice(p: { deviceName: ZigbeeDeviceName }): true
	unsubscribeFromDevice(p: { deviceName: ZigbeeDeviceName }): true
	setDeviceState(p: { deviceName: ZigbeeDeviceName; state: unknown }): true
	showDeviceState<DeviceName extends ZigbeeDeviceName>(
		p: { [K in ZigbeeDeviceName]: { deviceName: K; state: ZigbeeDeviceStates[K] } }[DeviceName],
	): ZigbeeDeviceStates[ZigbeeDeviceName]
}

export type JrpcRequest<Method extends keyof JrpcSchema = keyof JrpcSchema> = {
	[M in keyof JrpcSchema]: {
		id: JrpcRequestId
		jsonrpc: "2.0"
		method: M
		params: Parameters<JrpcSchema[M]>[0]
	}
}[Method]

export type JrpcResponse<Method extends keyof JrpcSchema = keyof JrpcSchema> = {
	[M in keyof JrpcSchema]:
		| {
				id: JrpcRequestId
				jsonrpc: "2.0"
				result: ReturnType<JrpcSchema[M]>
		  }
		| {
				id: JrpcRequestId
				jsonrpc: "2.0"
				error: string
		  }
}[Method]

export function newJrpcRequestId(): JrpcRequestId {
	return nanoid()
}
