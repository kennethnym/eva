interface WeatherKitTokenOptions {
	teamId: string
	serviceId: string
	keyId: string
	privateKeyPath: string
	expiresIn?: number // in seconds, default 3600 (1 hour)
}

/**
 * Generates a JWT token for WeatherKit REST API authentication.
 *
 * WeatherKit requires a JWT signed with ES256 algorithm using a private key
 * from Apple Developer portal in p8 format.
 *
 * @param options - Configuration for token generation
 * @returns JWT token string
 */
export async function generateWeatherKitToken({
	teamId,
	serviceId,
	keyId,
	privateKeyPath,
	expiresIn = 3600,
}: WeatherKitTokenOptions): Promise<string> {
	const now = Math.floor(Date.now() / 1000)
	const exp = now + expiresIn

	// JWT Header
	const header = {
		alg: "ES256",
		kid: keyId,
		id: `${teamId}.${serviceId}`,
	}

	// JWT Payload
	const payload = {
		iss: teamId,
		iat: now,
		exp: exp,
		sub: serviceId,
	}

	// Read and parse the p8 private key using Bun's file API
	const file = Bun.file(privateKeyPath)
	const privateKeyPem = await file.text()
	const privateKey = await importPrivateKey(privateKeyPem)

	// Create JWT
	const token = await signJWT(header, payload, privateKey)

	return token
}

/**
 * Imports a private key from p8 (PKCS#8) format.
 * The p8 file contains a PEM-encoded PKCS#8 private key.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
	// Remove PEM header/footer and whitespace
	const pemContents = pem
		.replace(/-----BEGIN PRIVATE KEY-----/, "")
		.replace(/-----END PRIVATE KEY-----/, "")
		.replace(/\s/g, "")

	// Decode base64 to binary
	const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

	// Import the key using Web Crypto API
	const key = await crypto.subtle.importKey(
		"pkcs8",
		binaryDer,
		{
			name: "ECDSA",
			namedCurve: "P-256",
		},
		false,
		["sign"],
	)

	return key
}

/**
 * Signs a JWT using ES256 algorithm.
 */
async function signJWT(
	header: Record<string, unknown>,
	payload: Record<string, unknown>,
	privateKey: CryptoKey,
): Promise<string> {
	// Encode header and payload
	const encodedHeader = base64UrlEncode(JSON.stringify(header))
	const encodedPayload = base64UrlEncode(JSON.stringify(payload))

	// Create signing input
	const signingInput = `${encodedHeader}.${encodedPayload}`
	const messageBuffer = new TextEncoder().encode(signingInput)

	// Sign the message
	const signature = await crypto.subtle.sign(
		{
			name: "ECDSA",
			hash: { name: "SHA-256" },
		},
		privateKey,
		messageBuffer,
	)

	// Encode signature
	const encodedSignature = base64UrlEncode(signature)

	// Return complete JWT
	return `${signingInput}.${encodedSignature}`
}

/**
 * Base64 URL-safe encoding (without padding).
 */
function base64UrlEncode(input: string | ArrayBuffer): string {
	let base64: string

	if (typeof input === "string") {
		base64 = btoa(input)
	} else {
		const bytes = new Uint8Array(input)
		const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
		base64 = btoa(binary)
	}

	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}
