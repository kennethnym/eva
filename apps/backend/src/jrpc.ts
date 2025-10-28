export type JrpcRequest = {
	jsonrpc: "2.0"
	method: string
	params: unknown
	id: number
}
