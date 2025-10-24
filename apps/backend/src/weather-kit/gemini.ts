/**
 * Gemini AI integration for generating weather descriptions
 */

interface WeatherData {
  condition: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationChance?: number;
  uvIndex: number;
  daytimeCondition?: string;
  overnightCondition?: string;
  isNighttime?: boolean;
  tomorrowHighTemp?: number;
  tomorrowLowTemp?: number;
  tomorrowCondition?: string;
  tomorrowPrecipitationChance?: number;
}

/**
 * Generates a concise weather description using Gemini 2.5 Flash
 */
export async function generateWeatherDescription(
  weatherData: WeatherData,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const prompt = buildWeatherPrompt(weatherData);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
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
            temperature: 0.7,
            maxOutputTokens: 120,
            topP: 0.95,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const description =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return description;
  } catch (error) {
    console.error("Failed to generate weather description:", error);
    // Fallback to basic description
    return `${weatherData.condition}, ${Math.round(weatherData.temperature)}°C`;
  }
}

/**
 * Builds an optimized prompt for Gemini to generate weather descriptions
 */
function buildWeatherPrompt(weatherData: WeatherData): string {
  let laterConditions = "";
  
  // If it's nighttime, mention tomorrow's weather
  if (weatherData.isNighttime && weatherData.tomorrowCondition) {
    laterConditions = `\n\nTomorrow's forecast:
- Condition: ${weatherData.tomorrowCondition}
- High: ${weatherData.tomorrowHighTemp ? Math.round(weatherData.tomorrowHighTemp) : "N/A"}°C
- Low: ${weatherData.tomorrowLowTemp ? Math.round(weatherData.tomorrowLowTemp) : "N/A"}°C
${weatherData.tomorrowPrecipitationChance ? `- Precipitation chance: ${Math.round(weatherData.tomorrowPrecipitationChance * 100)}%` : ""}`;
  } 
  // Otherwise, mention changes later today
  else if (weatherData.daytimeCondition || weatherData.overnightCondition) {
    laterConditions = `\n- Later today: ${weatherData.daytimeCondition || weatherData.overnightCondition}`;
  }

  return `Generate a concise, natural weather description for a dashboard. Keep it under 25 words.

Current conditions:
- Condition: ${weatherData.condition}
- Feels like: ${Math.round(weatherData.feelsLike)}°C
- Humidity: ${Math.round(weatherData.humidity * 100)}%
- Wind speed: ${Math.round(weatherData.windSpeed)} km/h
${weatherData.precipitationChance ? `- Precipitation chance: ${Math.round(weatherData.precipitationChance * 100)}%` : ""}
- UV index: ${weatherData.uvIndex}${laterConditions}

Requirements:
- Be conversational and friendly
- Focus on what matters most (condition, any warnings)
- DO NOT mention the current temperature - it will be displayed separately
- CRITICAL: If it's nighttime and tomorrow's forecast is provided, PRIORITIZE tomorrow's weather (e.g., "Cool night. Tomorrow will be partly cloudy with a high of 10°C.")
- If it's daytime and conditions change later, mention it (e.g., "turning cloudy later", "clearing up tonight")
- Tomorrow's temperature is OK to mention
- Mention feels-like only if significantly different (>3°C) and explain WHY (e.g., "due to wind", "due to humidity")
- Include precipitation chance if >30%
- For wind: Use descriptive terms (calm, light, moderate, strong, extreme) - NEVER use specific km/h numbers
- For UV: Use descriptive terms (low, moderate, high, very high, extreme) - NEVER use specific numbers
- Warn about extreme conditions (very hot/cold, high UV, strong winds)
- Use natural language, not technical jargon
- NO emojis
- One or two short sentences maximum

Example good outputs (DAYTIME):
- "Partly cloudy and pleasant. Light winds make it comfortable."
- "Clear skies, but feels hotter. High UV - wear sunscreen."
- "Mostly sunny, turning cloudy later. Comfortable conditions."
- "Rainy with 70% chance of more rain. Bring an umbrella."
- "Feels much colder due to strong winds. Bundle up."
- "Cloudy and mild, clearing up tonight."
- "Feels warmer due to humidity. Stay hydrated."

Example good outputs (NIGHTTIME - focus on tomorrow):
- "Cool night. Tomorrow will be sunny and warm with a high of 24°C."
- "Clear skies. Expect partly cloudy skies tomorrow, high of 10°C."
- "Chilly night. Tomorrow brings rain with a high of 15°C."
- "Mild evening. Tomorrow will be hot and sunny, reaching 32°C."

Example BAD outputs (avoid these):
- "Mostly clear at 7°C, feels like 0°C due to the 21 km/h wind." ❌ (don't mention current temp, don't use specific wind speed)
- "Sunny at 28°C with UV index of 9." ❌ (don't mention current temp, don't use specific UV number)
- "Temperature is 22°C with 65% humidity." ❌ (don't mention current temp, too technical)

Generate description:`;
}
