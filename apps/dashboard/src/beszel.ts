/**
 * Beszel System Stats API TypeScript Types
 * For server monitoring and system statistics
 */

import { queryOptions } from "@tanstack/react-query"

const getApiBaseUrl = () => {
	const protocol = window.location.protocol
	const host = import.meta.env.VITE_API_HOST || window.location.host
	return `${protocol}//${host}`
}

const API_BASE_URL = getApiBaseUrl()

// System Info
export interface BeszelSystemInfo {
	name: string
	info: {
		cpu: number
		ram: number
		disk: number
	}
}

// Systems Response
export interface BeszelSystemsResponse {
	lastUpdated: string
	systems: BeszelSystemInfo[]
	totalSystems: number
}

// TanStack Query Options

/**
 * Query options for fetching Beszel system stats
 * Returns CPU, RAM, and disk usage for all monitored systems
 */
export function beszelSystemsQuery() {
	return queryOptions({
		queryKey: ["beszel", "systems"],
		queryFn: async (): Promise<BeszelSystemsResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/beszel/systems`)
			if (!response.ok) {
				throw new Error("Failed to fetch Beszel system stats")
			}
			return response.json()
		},
		staleTime: 5 * 1000, // 5 seconds (system stats update frequently)
		gcTime: 30 * 1000, // 30 seconds
	})
}

// Helper function to format percentage
export function formatPercentage(value: number): string {
	return `${value.toFixed(1)}%`
}

// Helper function to get usage color based on percentage
export function getUsageColor(percentage: number): string {
	if (percentage >= 90) return "text-red-500"
	if (percentage >= 75) return "text-orange-500"
	if (percentage >= 50) return "text-yellow-500"
	return "text-green-500"
}

// Helper function to get usage background color
export function getUsageBackgroundColor(percentage: number): string {
	if (percentage >= 90) return "bg-red-500"
	if (percentage >= 75) return "bg-orange-500"
	if (percentage >= 50) return "bg-yellow-500"
	return "bg-green-500"
}
