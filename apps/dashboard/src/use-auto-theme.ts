import { useEffect } from "react"

interface SunTimes {
	sunrise: Date
	sunset: Date
}

function calculateSunTimes(latitude: number, longitude: number, date: Date = new Date()): SunTimes {
	const julianDay = getJulianDay(date)
	const julianCentury = (julianDay - 2451545) / 36525

	const geomMeanLongSun = (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) % 360
	const geomMeanAnomSun = 357.52911 + julianCentury * (35999.05029 - 0.0001537 * julianCentury)

	const eccentEarthOrbit = 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury)

	const sunEqOfCtr =
		Math.sin(toRadians(geomMeanAnomSun)) * (1.914602 - julianCentury * (0.004817 + 0.000014 * julianCentury)) +
		Math.sin(toRadians(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * julianCentury) +
		Math.sin(toRadians(3 * geomMeanAnomSun)) * 0.000289

	const sunTrueLong = geomMeanLongSun + sunEqOfCtr
	const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(toRadians(125.04 - 1934.136 * julianCentury))

	const meanObliqEcliptic = 23 + (26 + (21.448 - julianCentury * (46.815 + julianCentury * (0.00059 - julianCentury * 0.001813))) / 60) / 60

	const obliqCorr = meanObliqEcliptic + 0.00256 * Math.cos(toRadians(125.04 - 1934.136 * julianCentury))

	const sunDeclin = toDegrees(Math.asin(Math.sin(toRadians(obliqCorr)) * Math.sin(toRadians(sunAppLong))))

	const varY = Math.tan(toRadians(obliqCorr / 2)) * Math.tan(toRadians(obliqCorr / 2))

	const eqOfTime =
		4 *
		toDegrees(
			varY * Math.sin(2 * toRadians(geomMeanLongSun)) -
				2 * eccentEarthOrbit * Math.sin(toRadians(geomMeanAnomSun)) +
				4 * eccentEarthOrbit * varY * Math.sin(toRadians(geomMeanAnomSun)) * Math.cos(2 * toRadians(geomMeanLongSun)) -
				0.5 * varY * varY * Math.sin(4 * toRadians(geomMeanLongSun)) -
				1.25 * eccentEarthOrbit * eccentEarthOrbit * Math.sin(2 * toRadians(geomMeanAnomSun)),
		)

	const haSunrise = toDegrees(Math.acos(Math.cos(toRadians(90.833)) / (Math.cos(toRadians(latitude)) * Math.cos(toRadians(sunDeclin))) - Math.tan(toRadians(latitude)) * Math.tan(toRadians(sunDeclin))))

	const solarNoon = (720 - 4 * longitude - eqOfTime) / 1440
	const sunriseTime = solarNoon - (haSunrise * 4) / 1440
	const sunsetTime = solarNoon + (haSunrise * 4) / 1440

	const sunrise = new Date(date)
	sunrise.setHours(0, 0, 0, 0)
	sunrise.setMinutes(sunriseTime * 1440)

	const sunset = new Date(date)
	sunset.setHours(0, 0, 0, 0)
	sunset.setMinutes(sunsetTime * 1440)

	return { sunrise, sunset }
}

function getJulianDay(date: Date): number {
	const year = date.getFullYear()
	const month = date.getMonth() + 1
	const day = date.getDate()
	const hour = date.getHours()
	const minute = date.getMinutes()
	const second = date.getSeconds()

	let a = Math.floor((14 - month) / 12)
	let y = year + 4800 - a
	let m = month + 12 * a - 3

	let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

	return jdn + (hour - 12) / 24 + minute / 1440 + second / 86400
}

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
	return (radians * 180) / Math.PI
}

function isDarkMode(latitude: number, longitude: number): boolean {
	const now = new Date()
	const { sunrise, sunset } = calculateSunTimes(latitude, longitude, now)

	return now < sunrise || now > sunset
}

export function useAutoTheme(latitude: number, longitude: number) {
	useEffect(() => {
		const updateTheme = () => {
			const shouldBeDark = isDarkMode(latitude, longitude)

			if (shouldBeDark) {
				document.documentElement.classList.add("dark")
			} else {
				document.documentElement.classList.remove("dark")
			}
		}

		updateTheme()

		const interval = setInterval(updateTheme, 60000)

		return () => clearInterval(interval)
	}, [latitude, longitude])
}
