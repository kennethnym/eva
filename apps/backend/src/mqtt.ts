import mqtt from "mqtt"

export async function createMqttClient({
	host,
	port,
	username,
	password,
}: { host: string; port: number; username: string; password: string }) {
	return await mqtt.connectAsync({
		host,
		port,
		username,
		password,
	})
}
