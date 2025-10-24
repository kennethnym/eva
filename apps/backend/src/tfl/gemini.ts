/**
 * Gemini AI integration for shortening TfL disruption descriptions
 */

import { getCachedShortened, setCachedShortened } from "./cache"

interface DisruptionToShorten {
	lineName: string
	status: string
	reason: string
}

interface ShortenedResult {
	lineName: string
	shortened: string
}

/**
 * Strip line name prefix from description
 */
function stripLineName(text: string, lineName: string): string {
	// Escape special regex characters in line name
	const escapedName = lineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	
	// Remove patterns like "Central Line:", "CENTRAL LINE:", "Mildmay Line:", etc.
	const patterns = [
		new RegExp(`^${escapedName}\\s*Line:\\s*`, "i"),
		new RegExp(`^${escapedName}:\\s*`, "i"),
		new RegExp(`^${escapedName.toUpperCase()}\\s*LINE:\\s*`),
	]
	
	let result = text
	for (const pattern of patterns) {
		result = result.replace(pattern, "")
	}
	
	return result.trim()
}

/**
 * Shorten multiple disruption reasons in a single Gemini API call
 */
export async function shortenMultipleDisruptions(
	disruptions: DisruptionToShorten[]
): Promise<Map<string, string>> {
	const apiKey = process.env.GEMINI_API_KEY
	const results = new Map<string, string>()

	if (!apiKey) {
		console.warn("GEMINI_API_KEY not set, returning stripped versions")
		for (const disruption of disruptions) {
			results.set(disruption.lineName, stripLineName(disruption.reason, disruption.lineName))
		}
		return results
	}

	// Filter disruptions that need shortening
	const toShorten: DisruptionToShorten[] = []
	
	for (const disruption of disruptions) {
		const stripped = stripLineName(disruption.reason, disruption.lineName)
		
		// Check cache first
		const cached = getCachedShortened(disruption.reason)
		if (cached) {
			results.set(disruption.lineName, cached)
			continue
		}
		
		// If already short after stripping, use that
		if (stripped.length < 80) {
			results.set(disruption.lineName, stripped)
			setCachedShortened(disruption.reason, stripped)
			continue
		}
		
		// Needs shortening
		toShorten.push({ ...disruption, reason: stripped })
	}

	// If nothing needs shortening, return early
	if (toShorten.length === 0) {
		return results
	}

	// Build batch prompt
	const prompt = buildBatchShorteningPrompt(toShorten)

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: prompt,
								},
							],
						},
					],
					generationConfig: {
						temperature: 0.3,
						maxOutputTokens: 2000, // Higher limit to account for thinking tokens in Gemini 2.5 Flash
						topP: 0.9,
					},
				}),
			}
		)

		if (!response.ok) {
			console.error(`Gemini API error: ${response.status}`)
			// Fallback to stripped versions
			for (const disruption of toShorten) {
				results.set(disruption.lineName, disruption.reason)
			}
			return results
		}

		const data = (await response.json()) as any
		const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""

		// Parse JSON response
		try {
			// Extract JSON from markdown code blocks if present
			let jsonText = responseText
			const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
			if (jsonMatch) {
				jsonText = jsonMatch[1]
			}

			const shortened = JSON.parse(jsonText) as ShortenedResult[]

			// Map results
			for (const item of shortened) {
				results.set(item.lineName, item.shortened)
				// Cache the result
				const original = toShorten.find(d => d.lineName === item.lineName)
				if (original) {
					setCachedShortened(original.reason, item.shortened)
				}
			}
		} catch (parseError) {
			console.error("Failed to parse Gemini JSON response:", parseError)
			console.error("Response was:", responseText)
			// Fallback to stripped versions
			for (const disruption of toShorten) {
				results.set(disruption.lineName, disruption.reason)
			}
		}
	} catch (error) {
		console.error("Failed to shorten disruptions:", error)
		// Fallback to stripped versions
		for (const disruption of toShorten) {
			results.set(disruption.lineName, disruption.reason)
		}
	}

	return results
}

/**
 * Builds a batch prompt for Gemini to shorten multiple disruptions at once
 */
function buildBatchShorteningPrompt(disruptions: DisruptionToShorten[]): string {
	const disruptionsList = disruptions.map((d, i) => 
		`${i + 1}. Line: ${d.lineName}\n   Status: ${d.status}\n   Message: "${d.reason}"`
	).join('\n\n')

	return `Shorten these London transport disruption messages for a dashboard display. Return your response as a JSON array.

Disruptions to shorten:
${disruptionsList}

Requirements:
- Keep each shortened message under 80 characters
- Be concise but keep essential information (reason, locations, alternatives, time info)
- DO NOT include line names in the shortened text (they're displayed separately)
- Use natural, clear language
- NO emojis

Return ONLY a JSON array in this exact format:
[
  {"lineName": "Piccadilly", "shortened": "Suspended Rayners Lane-Uxbridge until Fri due to Storm Benjamin. Use Metropolitan line."},
  {"lineName": "Central", "shortened": "Minor delays due to train cancellations"},
  ...
]

Good examples of shortened messages:
- "Suspended Rayners Lane-Uxbridge until Fri due to Storm Benjamin. Use Metropolitan line."
- "Minor delays due to train cancellations"
- "Minor delays due to earlier incidents at Gospel Oak & Highbury"
- "Severe delays - signal failure at King's Cross. Use buses/Elizabeth line."
- "No service Earls Court-Wimbledon until Sun 27 Oct (engineering)"

Generate JSON array:`
}


