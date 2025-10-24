/**
 * WeatherKit REST API TypeScript Types
 * Based on Apple's WeatherKit REST API documentation
 * https://developer.apple.com/documentation/weatherkitrestapi/
 */

import { queryOptions } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"
import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudHail,
	CloudLightning,
	CloudMoon,
	CloudRain,
	CloudSnow,
	CloudSun,
	Snowflake,
	Sun,
	Thermometer,
	ThermometerSnowflake,
	ThermometerSun,
	Tornado,
	Waves,
	Wind,
} from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export const DEFAULT_LATITUDE = Number(import.meta.env.VITE_DEFAULT_LATITUDE) || 37.7749
export const DEFAULT_LONGITUDE = Number(import.meta.env.VITE_DEFAULT_LONGITUDE) || -122.4194

// Main Weather Response
export interface WeatherResponse {
	currentWeather?: CurrentWeather
	forecastDaily?: DailyForecast
	forecastHourly?: HourlyForecast
	forecastNextHour?: NextHourForecast
	weatherAlerts?: WeatherAlertCollection
	aiDescription?: string | null
}

// Current Weather
export interface CurrentWeather {
	name: "CurrentWeather"
	metadata: WeatherMetadata
	asOf: string // ISO 8601 date
	cloudCover: number // 0-1
	cloudCoverLowAltPct?: number
	cloudCoverMidAltPct?: number
	cloudCoverHighAltPct?: number
	conditionCode: WeatherCondition
	daylight: boolean
	humidity: number // 0-1
	precipitationIntensity: number // mm/hr
	pressure: number // millibars
	pressureTrend: PressureTrend
	temperature: number // celsius
	temperatureApparent: number // celsius
	temperatureDewPoint: number // celsius
	uvIndex: number
	visibility: number // meters
	windDirection: number // degrees
	windGust: number // km/h
	windSpeed: number // km/h
}

// Daily Forecast
export interface DailyForecast {
	name: "DailyForecast"
	metadata: WeatherMetadata
	days: DayWeatherConditions[]
}

export interface DayWeatherConditions {
	forecastStart: string // ISO 8601 date
	forecastEnd: string // ISO 8601 date
	conditionCode: WeatherCondition
	maxUvIndex: number
	moonPhase: MoonPhase
	moonrise?: string // ISO 8601 date
	moonset?: string // ISO 8601 date
	precipitationAmount: number // mm
	precipitationChance: number // 0-1
	precipitationType: PrecipitationType
	snowfallAmount: number // cm
	solarMidnight?: string // ISO 8601 date
	solarNoon?: string // ISO 8601 date
	sunrise?: string // ISO 8601 date
	sunriseCivil?: string // ISO 8601 date
	sunriseNautical?: string // ISO 8601 date
	sunriseAstronomical?: string // ISO 8601 date
	sunset?: string // ISO 8601 date
	sunsetCivil?: string // ISO 8601 date
	sunsetNautical?: string // ISO 8601 date
	sunsetAstronomical?: string // ISO 8601 date
	temperatureMax: number // celsius
	temperatureMin: number // celsius
	daytimeForecast?: DayPartForecast
	overnightForecast?: DayPartForecast
	restOfDayForecast?: DayPartForecast
}

export interface DayPartForecast {
	forecastStart: string // ISO 8601 date
	forecastEnd: string // ISO 8601 date
	cloudCover: number // 0-1
	conditionCode: WeatherCondition
	humidity: number // 0-1
	precipitationAmount: number // mm
	precipitationChance: number // 0-1
	precipitationType: PrecipitationType
	snowfallAmount: number // cm
	windDirection: number // degrees
	windSpeed: number // km/h
}

// Hourly Forecast
export interface HourlyForecast {
	name: "HourlyForecast"
	metadata: WeatherMetadata
	hours: HourWeatherConditions[]
}

export interface HourWeatherConditions {
	forecastStart: string // ISO 8601 date
	cloudCover: number // 0-1
	cloudCoverLowAltPct?: number
	cloudCoverMidAltPct?: number
	cloudCoverHighAltPct?: number
	conditionCode: WeatherCondition
	daylight: boolean
	humidity: number // 0-1
	precipitationAmount: number // mm
	precipitationIntensity: number // mm/hr
	precipitationChance: number // 0-1
	precipitationType: PrecipitationType
	pressure: number // millibars
	pressureTrend: PressureTrend
	snowfallIntensity?: number // mm/hr
	snowfallAmount?: number // cm
	temperature: number // celsius
	temperatureApparent: number // celsius
	temperatureDewPoint: number // celsius
	uvIndex: number
	visibility: number // meters
	windDirection: number // degrees
	windGust: number // km/h
	windSpeed: number // km/h
}

// Next Hour Forecast (Minute-by-minute precipitation)
export interface NextHourForecast {
	name: "NextHourForecast"
	metadata: WeatherMetadata
	forecastStart: string // ISO 8601 date
	forecastEnd: string // ISO 8601 date
	minutes: MinuteWeatherConditions[]
	summary: NextHourForecastSummary[]
}

export interface MinuteWeatherConditions {
	startTime: string // ISO 8601 date
	precipitationChance: number // 0-1
	precipitationIntensity: number // mm/hr
}

export interface NextHourForecastSummary {
	startTime: string // ISO 8601 date
	condition: PrecipitationCondition
	precipitationChance: number // 0-1
	precipitationIntensity: number // mm/hr
}

// Weather Alerts
export interface WeatherAlertCollection {
	name: "WeatherAlertCollection"
	metadata: WeatherMetadata
	alerts: WeatherAlert[]
	detailsUrl: string
}

export interface WeatherAlert {
	name: "WeatherAlert"
	id: string
	areaId?: string
	areaName?: string
	countryCode: string
	description: string
	effectiveTime: string // ISO 8601 date
	expireTime: string // ISO 8601 date
	issuedTime: string // ISO 8601 date
	eventOnsetTime?: string // ISO 8601 date
	eventEndTime?: string // ISO 8601 date
	severity: AlertSeverity
	source: string
	urgency: AlertUrgency
	certainty: AlertCertainty
	importance?: AlertImportance
	responses?: AlertResponse[]
	detailsUrl: string
}

// Metadata
export interface WeatherMetadata {
	attributionURL: string
	expireTime: string // ISO 8601 date
	latitude: number
	longitude: number
	readTime: string // ISO 8601 date
	reportedTime: string // ISO 8601 date
	units: "m" | "e" // metric or imperial
	version: number
	sourceType?: string
}

// Enums and Types
export type WeatherCondition =
	| "Clear"
	| "Cloudy"
	| "Dust"
	| "Fog"
	| "Haze"
	| "MostlyClear"
	| "MostlyCloudy"
	| "PartlyCloudy"
	| "ScatteredThunderstorms"
	| "Smoke"
	| "Breezy"
	| "Windy"
	| "Drizzle"
	| "HeavyRain"
	| "Rain"
	| "Showers"
	| "Flurries"
	| "HeavySnow"
	| "MixedRainAndSleet"
	| "MixedRainAndSnow"
	| "MixedRainfall"
	| "MixedSnowAndSleet"
	| "ScatteredShowers"
	| "ScatteredSnowShowers"
	| "Sleet"
	| "Snow"
	| "SnowShowers"
	| "Blizzard"
	| "BlowingSnow"
	| "FreezingDrizzle"
	| "FreezingRain"
	| "Frigid"
	| "Hail"
	| "Hot"
	| "Hurricane"
	| "IsolatedThunderstorms"
	| "SevereThunderstorm"
	| "Thunderstorm"
	| "Tornado"
	| "TropicalStorm"

export type PrecipitationType = "clear" | "precipitation" | "rain" | "snow" | "sleet" | "hail" | "mixed"

export type PrecipitationCondition = "clear" | "precipitation"

export type PressureTrend = "rising" | "falling" | "steady"

export type MoonPhase =
	| "new"
	| "waxingCrescent"
	| "firstQuarter"
	| "waxingGibbous"
	| "full"
	| "waningGibbous"
	| "lastQuarter"
	| "waningCrescent"

export type AlertSeverity = "extreme" | "severe" | "moderate" | "minor" | "unknown"

export type AlertUrgency = "immediate" | "expected" | "future" | "past" | "unknown"

export type AlertCertainty = "observed" | "likely" | "possible" | "unlikely" | "unknown"

export type AlertImportance = "high" | "normal" | "low"

export type AlertResponse =
	| "shelter"
	| "evacuate"
	| "prepare"
	| "execute"
	| "avoid"
	| "monitor"
	| "assess"
	| "allClear"
	| "none"

// Helper function to format temperature
export function formatTemperature(celsius: number, unit: "C" | "F" = "C"): string {
	if (unit === "F") {
		return `${Math.round((celsius * 9) / 5 + 32)}°F`
	}
	return `${Math.round(celsius)}°C`
}

// Helper function to format wind speed
export function formatWindSpeed(kmh: number, unit: "kmh" | "mph" = "kmh"): string {
	if (unit === "mph") {
		return `${Math.round(kmh * 0.621371)} mph`
	}
	return `${Math.round(kmh)} km/h`
}

// Helper function to format precipitation
export function formatPrecipitation(mm: number, unit: "mm" | "in" = "mm"): string {
	if (unit === "in") {
		return `${(mm * 0.0393701).toFixed(2)} in`
	}
	return `${mm.toFixed(1)} mm`
}

// Helper function to get today's high/low from daily forecast
export function getTodayHighLow(forecast?: DailyForecast): {
	high: number | null
	low: number | null
} {
	if (!forecast?.days || forecast.days.length === 0) {
		return { high: null, low: null }
	}

	const today = forecast.days[0]
	return {
		high: today.temperatureMax,
		low: today.temperatureMin,
	}
}

// Weather condition to Lucide icon mapping
export const weatherConditionIcons: Record<WeatherCondition, LucideIcon> = {
	Clear: Sun,
	MostlyClear: CloudSun,
	PartlyCloudy: CloudSun,
	MostlyCloudy: Cloud,
	Cloudy: Cloud,
	Fog: CloudFog,
	Haze: CloudFog,
	Smoke: CloudFog,
	Dust: Wind,
	Breezy: Wind,
	Windy: Wind,
	Drizzle: CloudDrizzle,
	Rain: CloudRain,
	Showers: CloudRain,
	ScatteredShowers: CloudRain,
	HeavyRain: CloudRain,
	Flurries: CloudSnow,
	Snow: CloudSnow,
	SnowShowers: CloudSnow,
	ScatteredSnowShowers: CloudSnow,
	HeavySnow: Snowflake,
	Blizzard: Snowflake,
	BlowingSnow: Snowflake,
	Sleet: CloudSnow,
	MixedRainAndSleet: CloudSnow,
	MixedRainAndSnow: CloudSnow,
	MixedRainfall: CloudRain,
	MixedSnowAndSleet: CloudSnow,
	FreezingDrizzle: CloudSnow,
	FreezingRain: CloudSnow,
	Hail: CloudHail,
	Thunderstorm: CloudLightning,
	IsolatedThunderstorms: CloudLightning,
	ScatteredThunderstorms: CloudLightning,
	SevereThunderstorm: CloudLightning,
	Tornado: Tornado,
	TropicalStorm: Waves,
	Hurricane: Waves,
	Hot: ThermometerSun,
	Frigid: ThermometerSnowflake,
}

// Helper function to get weather icon for a condition
export function getWeatherIcon(condition: WeatherCondition): LucideIcon {
	return weatherConditionIcons[condition] || Cloud
}

// Helper function to get condition icon/description
export function getConditionDescription(condition: WeatherCondition): string {
	const descriptions: Record<WeatherCondition, string> = {
		Clear: "Clear",
		Cloudy: "Cloudy",
		Dust: "Dust",
		Fog: "Fog",
		Haze: "Haze",
		MostlyClear: "Mostly Clear",
		MostlyCloudy: "Mostly Cloudy",
		PartlyCloudy: "Partly Cloudy",
		ScatteredThunderstorms: "Scattered Thunderstorms",
		Smoke: "Smoke",
		Breezy: "Breezy",
		Windy: "Windy",
		Drizzle: "Drizzle",
		HeavyRain: "Heavy Rain",
		Rain: "Rain",
		Showers: "Showers",
		Flurries: "Flurries",
		HeavySnow: "Heavy Snow",
		MixedRainAndSleet: "Mixed Rain and Sleet",
		MixedRainAndSnow: "Mixed Rain and Snow",
		MixedRainfall: "Mixed Rainfall",
		MixedSnowAndSleet: "Mixed Snow and Sleet",
		ScatteredShowers: "Scattered Showers",
		ScatteredSnowShowers: "Scattered Snow Showers",
		Sleet: "Sleet",
		Snow: "Snow",
		SnowShowers: "Snow Showers",
		Blizzard: "Blizzard",
		BlowingSnow: "Blowing Snow",
		FreezingDrizzle: "Freezing Drizzle",
		FreezingRain: "Freezing Rain",
		Frigid: "Frigid",
		Hail: "Hail",
		Hot: "Hot",
		Hurricane: "Hurricane",
		IsolatedThunderstorms: "Isolated Thunderstorms",
		SevereThunderstorm: "Severe Thunderstorm",
		Thunderstorm: "Thunderstorm",
		Tornado: "Tornado",
		TropicalStorm: "Tropical Storm",
	}
	return descriptions[condition] || condition
}

// TanStack Query Options

/**
 * Query options for fetching current weather + daily forecast + AI description
 * This is a combined endpoint that returns all three in one API call
 */
export function currentWeatherQuery(lat: number, lon: number) {
	return queryOptions({
		queryKey: ["weather", "current", lat, lon],
		queryFn: async (): Promise<WeatherResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/weather/current/${lat}/${lon}`)
			if (!response.ok) {
				throw new Error("Failed to fetch current weather")
			}
			return response.json()
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
	})
}

/**
 * Query options for fetching daily forecast
 */
export function dailyForecastQuery(lat: number, lon: number) {
	return queryOptions({
		queryKey: ["weather", "forecast", "daily", lat, lon],
		queryFn: async (): Promise<WeatherResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/weather/forecast/${lat}/${lon}`)
			if (!response.ok) {
				throw new Error("Failed to fetch daily forecast")
			}
			return response.json()
		},
		staleTime: 30 * 60 * 1000, // 30 minutes
		gcTime: 60 * 60 * 1000, // 1 hour
	})
}

/**
 * Query options for fetching hourly forecast
 */
export function hourlyForecastQuery(lat: number, lon: number) {
	return queryOptions({
		queryKey: ["weather", "forecast", "hourly", lat, lon],
		queryFn: async (): Promise<WeatherResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/weather/hourly/${lat}/${lon}`)
			if (!response.ok) {
				throw new Error("Failed to fetch hourly forecast")
			}
			return response.json()
		},
		staleTime: 15 * 60 * 1000, // 15 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	})
}

/**
 * Query options for fetching complete weather data (all data sets)
 */
export function completeWeatherQuery(lat: number, lon: number) {
	return queryOptions({
		queryKey: ["weather", "complete", lat, lon],
		queryFn: async (): Promise<WeatherResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/weather/complete/${lat}/${lon}`)
			if (!response.ok) {
				throw new Error("Failed to fetch complete weather data")
			}
			return response.json()
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 15 * 60 * 1000, // 15 minutes
	})
}

// AI Weather Description Response
export interface WeatherDescriptionResponse {
	description: string
	cached: boolean
}

/**
 * Query options for fetching AI-generated weather description
 * Backend caches descriptions for 1 hour per location
 */
export function weatherDescriptionQuery(lat: number, lon: number) {
	return queryOptions({
		queryKey: ["weather", "description", lat, lon],
		queryFn: async (): Promise<WeatherDescriptionResponse> => {
			const response = await fetch(`${API_BASE_URL}/api/weather/description/${lat}/${lon}`)
			if (!response.ok) {
				throw new Error("Failed to fetch weather description")
			}
			return response.json()
		},
		staleTime: 60 * 60 * 1000, // 1 hour (matches backend cache)
		gcTime: 2 * 60 * 60 * 1000, // 2 hours
	})
}
