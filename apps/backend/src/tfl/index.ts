import { Hono } from "hono"
import { shortenMultipleDisruptions } from "./gemini"

const tfl = new Hono()

interface TflLineStatus {
	$type: string
	id: number
	lineId?: string
	statusSeverity: number
	statusSeverityDescription: string
	reason?: string
	created: string
	validityPeriods: {
		$type: string
		fromDate: string
		toDate: string
		isNow: boolean
	}[]
	disruption?: {
		$type: string
		category: string
		categoryDescription: string
		description: string
		affectedRoutes: unknown[]
		affectedStops: unknown[]
		closureText: string
	}
}

interface TflLine {
	$type: string
	id: string
	name: string
	modeName: string
	disruptions: unknown[]
	created: string
	modified: string
	lineStatuses: TflLineStatus[]
	routeSections: unknown[]
	serviceTypes: {
		$type: string
		name: string
		uri: string
	}[]
	crowding: {
		$type: string
	}
}

interface DisruptionSummary {
	lineId: string
	lineName: string
	mode: string
	status: string
	statusSeverity: number
	reason?: string
	validFrom?: string
	validTo?: string
}

interface DisruptionsResponse {
	lastUpdated: string
	disruptions: DisruptionSummary[]
	goodService: string[]
	totalLines: number
	disruptedLines: number
}

// Get current disruptions across all London transport modes
tfl.get("/disruptions", async (c) => {
	try {
		// Fetch status for all major transport modes
		const modes = ["tube", "overground", "dlr", "elizabeth-line", "tram"]
		const url = `https://api.tfl.gov.uk/Line/Mode/${modes.join(",")}/Status`

		const response = await fetch(url)

		if (!response.ok) {
			return new Response(
				JSON.stringify({
					error: "Failed to fetch TfL data",
					status: response.status,
				}),
				{
					status: response.status,
					headers: { "Content-Type": "application/json" },
				},
			)
		}

		const data = (await response.json()) as TflLine[]

		const disruptions: DisruptionSummary[] = []
		const goodService: string[] = []

		for (const line of data) {
			// Get the most severe status for this line
			const status = line.lineStatuses[0]

			if (!status) continue

			// statusSeverity: 10 = Good Service, anything less is a disruption
			if (status.statusSeverity === 10) {
				goodService.push(line.name)
			} else {
				const validPeriod = status.validityPeriods.find((p) => p.isNow)

				disruptions.push({
					lineId: line.id,
					lineName: line.name,
					mode: line.modeName,
					status: status.statusSeverityDescription,
					statusSeverity: status.statusSeverity,
					reason: status.reason,
					validFrom: validPeriod?.fromDate,
					validTo: validPeriod?.toDate,
				})
			}
		}

		// Sort disruptions by severity (lower number = more severe)
		disruptions.sort((a, b) => a.statusSeverity - b.statusSeverity)

		// Shorten all disruption reasons in a single Gemini API call
		const disruptionsToShorten = disruptions
			.filter(d => d.reason)
			.map(d => ({
				lineName: d.lineName,
				status: d.status,
				reason: d.reason!,
			}))

		if (disruptionsToShorten.length > 0) {
			const shortenedMap = await shortenMultipleDisruptions(disruptionsToShorten)
			
			// Apply shortened reasons back to disruptions
			for (const disruption of disruptions) {
				const shortened = shortenedMap.get(disruption.lineName)
				if (shortened) {
					disruption.reason = shortened
				}
			}
		}

		const summary: DisruptionsResponse = {
			lastUpdated: new Date().toISOString(),
			disruptions,
			goodService: goodService.sort(),
			totalLines: data.length,
			disruptedLines: disruptions.length,
		}

		return c.json(summary)
	} catch (error) {
		return c.json(
			{ error: "Internal server error", message: String(error) },
			500
		)
	}
})

// Get status for specific line(s)
tfl.get("/line/:lineIds", async (c) => {
	try {
		const lineIds = c.req.param("lineIds")

		const url = `https://api.tfl.gov.uk/Line/${lineIds}/Status`

		const response = await fetch(url)

		if (!response.ok) {
			return new Response(
				JSON.stringify({
					error: "Failed to fetch TfL line data",
					status: response.status,
				}),
				{
					status: response.status,
					headers: { "Content-Type": "application/json" },
				},
			)
		}

		const data = await response.json()
		return c.json(data)
	} catch (error) {
		return c.json(
			{ error: "Internal server error", message: String(error) },
			500
		)
	}
})

export default tfl
