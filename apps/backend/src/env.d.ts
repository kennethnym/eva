declare namespace NodeJS {
	interface ProcessEnv {
		ADP_TEAM_ID: string
		ADP_SERVICE_ID: string
		ADP_KEY_ID: string
		ADP_KEY_PATH: string
		GEMINI_API_KEY: string
		BESZEL_HOST?: string
		BESZEL_EMAIL?: string
		BESZEL_PASSWORD?: string
		MQTT_HOST: string
		MQTT_PORT: number
		MQTT_USERNAME: string
		MQTT_PASSWORD: string
	}
}
