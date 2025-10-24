import { Hono } from "hono"
import { type WeatherKitContext, weatherKitAuth } from "./weather-kit/middleware"
import { generateWeatherDescription } from "./weather-kit/gemini"
import { getCachedDescription, setCachedDescription } from "./weather-kit/cache"

const weather = new Hono<WeatherKitContext>()

// Apply middleware to all weather routes
weather.use("*", weatherKitAuth())

// Current weather + daily forecast (real-time data only)
weather.get("/current/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		// Fetch current weather and daily forecast in one call
		const response = await fetch(
			`https://weatherkit.apple.com/api/v1/weather/en_US/${lat}/${lon}?dataSets=currentWeather,forecastDaily`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (!response.ok) {
			const error = await response.text()
			return new Response(JSON.stringify({ error: "Failed to fetch weather data", details: error }), {
				status: response.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const data = await response.json()
		return c.json(data)
	} catch (error) {
		return c.json({ error: "Internal server error", message: String(error) }, 500)
	}
})

// Daily forecast endpoint
weather.get("/forecast/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		const response = await fetch(
			`https://weatherkit.apple.com/api/v1/weather/en_US/${lat}/${lon}?dataSets=forecastDaily`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (!response.ok) {
			return new Response(JSON.stringify({ error: "Failed to fetch forecast" }), {
				status: response.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const data = await response.json()
		return c.json(data)
	} catch (error) {
		return c.json({ error: String(error) }, 500)
	}
})

// Hourly forecast endpoint
weather.get("/hourly/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		const response = await fetch(
			`https://weatherkit.apple.com/api/v1/weather/en_US/${lat}/${lon}?dataSets=forecastHourly`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (!response.ok) {
			return new Response(JSON.stringify({ error: "Failed to fetch hourly forecast" }), {
				status: response.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const data = await response.json()
		return c.json(data)
	} catch (error) {
		return c.json({ error: String(error) }, 500)
	}
})

// Availability endpoint - check what datasets are available for a location
weather.get("/availability/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		const url = `https://weatherkit.apple.com/api/v1/availability/${lat}/${lon}`
		console.log(`Checking availability: ${url}`)
		
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		console.log(`Availability response status: ${response.status}`)

		if (!response.ok) {
			const errorText = await response.text()
			console.error(`Availability error:`, errorText)
			return c.json({ error: "Failed to check availability", status: response.status }, response.status)
		}

		const data = await response.json()
		console.log(`Availability data:`, JSON.stringify(data, null, 2))
		return c.json(data)
	} catch (error) {
		console.error("Availability exception:", error)
		return c.json({ error: String(error) }, 500)
	}
})

// Complete weather data (all data sets)
weather.get("/complete/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		const response = await fetch(
			`https://weatherkit.apple.com/api/v1/weather/en_US/${lat}/${lon}?dataSets=currentWeather,forecastDaily,forecastHourly`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (!response.ok) {
			return new Response(JSON.stringify({ error: "Failed to fetch complete weather data" }), {
				status: response.status,
				headers: { "Content-Type": "application/json" },
			})
		}

		const data = await response.json()
		return c.json(data)
	} catch (error) {
		return c.json({ error: String(error) }, 500)
	}
})

// Generate AI weather description (cached for 1 hour)
weather.get("/description/:lat/:lon", async (c) => {
	const { lat, lon } = c.req.param()
	const token = c.get("weatherKitToken")

	try {
		// Check cache first
		const cached = getCachedDescription(lat, lon)
		if (cached) {
			return c.json({ description: cached, cached: true })
		}

		// Fetch current weather and today's forecast
		const response = await fetch(
			`https://weatherkit.apple.com/api/v1/weather/en_US/${lat}/${lon}?dataSets=currentWeather,forecastDaily`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (!response.ok) {
			return new Response(
				JSON.stringify({ error: "Failed to fetch weather data" }),
				{ status: response.status, headers: { "Content-Type": "application/json" } },
			)
		}

		const data = (await response.json()) as any
		const current = data.currentWeather
		const today = data.forecastDaily?.days?.[0]

		if (!current) {
			return c.json({ error: "No current weather data available" }, 404)
		}

		// Determine if it's nighttime (between 8 PM and 6 AM)
		const currentHour = new Date().getHours()
		const isNighttime = currentHour >= 20 || currentHour < 6
		
		// Get tomorrow's forecast if it's nighttime
		const tomorrow = isNighttime ? data.forecastDaily?.days?.[1] : null

		// Generate description using Gemini
		const description = await generateWeatherDescription({
			condition: current.conditionCode,
			temperature: current.temperature,
			feelsLike: current.temperatureApparent,
			humidity: current.humidity,
			windSpeed: current.windSpeed,
			precipitationChance: today?.precipitationChance,
			uvIndex: current.uvIndex,
			daytimeCondition: today?.daytimeForecast?.conditionCode,
			overnightCondition: today?.overnightForecast?.conditionCode,
			isNighttime,
			tomorrowHighTemp: tomorrow?.temperatureMax,
			tomorrowLowTemp: tomorrow?.temperatureMin,
			tomorrowCondition: tomorrow?.conditionCode,
			tomorrowPrecipitationChance: tomorrow?.precipitationChance,
		})

		// Cache the description
		setCachedDescription(lat, lon, description)

		return c.json({ description, cached: false })
	} catch (error) {
		return c.json({ error: String(error) }, 500)
	}
})

export default weather
