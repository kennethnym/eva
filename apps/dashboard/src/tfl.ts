/**
 * TfL (Transport for London) API TypeScript Types
 * For London transport status and disruptions
 */

import { queryOptions } from "@tanstack/react-query"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// Disruption Summary
export interface DisruptionSummary {
	lineId: string
	lineName: string
	mode: string
	status: string
	statusSeverity: number
	reason?: string
	validFrom?: string
	validTo?: string
}

// Disruptions Response
export interface DisruptionsResponse {
	lastUpdated: string
	disruptions: DisruptionSummary[]
	goodService: string[]
	totalLines: number
	disruptedLines: number
}

// Status severity levels
export enum StatusSeverity {
	SpecialService = 0,
	Closed = 1,
	Suspended = 2,
	PartSuspended = 3,
	PlannedClosure = 4,
	PartClosure = 5,
	SevereDelays = 6,
	ReducedService = 7,
	BusService = 8,
	MinorDelays = 9,
	GoodService = 10,
	PartClosed = 11,
	ExitOnly = 12,
	NoStepFreeAccess = 13,
	ChangeOfFrequency = 14,
	Diverted = 15,
	NotRunning = 16,
	IssuesReported = 17,
	NoIssues = 18,
	Information = 19,
	ServiceClosed = 20,
}

// Helper function to get severity color
export function getSeverityColor(severity: number): string {
	if (severity >= 10) return "green" // Good Service
	if (severity >= 9) return "orange" // Minor Delays
	if (severity >= 6) return "red" // Severe Delays or worse
	return "darkred" // Suspended/Closed
}

// Helper function to get severity label
export function getSeverityLabel(severity: number): string {
	switch (severity) {
		case 10:
			return "Good Service"
		case 9:
			return "Minor Delays"
		case 8:
			return "Bus Service"
		case 7:
			return "Reduced Service"
		case 6:
			return "Severe Delays"
		case 5:
			return "Part Closure"
		case 4:
			return "Planned Closure"
		case 3:
			return "Part Suspended"
		case 2:
			return "Suspended"
		case 1:
			return "Closed"
		default:
			return "Special Service"
	}
}

// Helper function to format line name for display
export function formatLineName(lineId: string): string {
	const lineNames: Record<string, string> = {
		bakerloo: "Bakerloo",
		central: "Central",
		circle: "Circle",
		district: "District",
		"hammersmith-city": "H&C",
		jubilee: "Jubilee",
		metropolitan: "Metropolitan",
		northern: "Northern",
		piccadilly: "Piccadilly",
		victoria: "Victoria",
		"waterloo-city": "W&C",
		"london-overground": "London Overground",
		dlr: "DLR",
		"elizabeth-line": "Elizabeth Line",
		tram: "Tram",
	}
	return lineNames[lineId] || lineId
}

/**
 * Query options for fetching current TfL disruptions
 * Returns disruptions across Tube, Overground, DLR, Elizabeth Line, and Tram
 */
export function tflDisruptionsQuery() {
	return queryOptions({
		queryKey: ["tfl", "disruptions"],
		queryFn: async (): Promise<DisruptionsResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/tfl/disruptions`)
			if (!response.ok) {
				throw new Error("Failed to fetch TfL disruptions")
			}
			return response.json()
		},
		select: (data) =>
			data.disruptions.sort((a, b) => {
				if (a.lineName.match(/northern/i)) return -1
				return a.statusSeverity - b.statusSeverity
			}),
		staleTime: 2 * 60 * 1000, // 2 minutes (TfL updates frequently)
		gcTime: 5 * 60 * 1000, // 5 minutes
	})
}

/**
 * Query options for fetching status of specific line(s)
 * @param lineIds - Comma-separated line IDs (e.g., "central,northern")
 */
export function tflLineStatusQuery(lineIds: string) {
	return queryOptions({
		queryKey: ["tfl", "line", lineIds],
		queryFn: async () => {
			const response = await fetch(`${API_BASE_URL}/api/tfl/line/${lineIds}`)
			if (!response.ok) {
				throw new Error("Failed to fetch TfL line status")
			}
			return response.json()
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000, // 5 minutes
	})
}
