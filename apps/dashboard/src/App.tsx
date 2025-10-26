import { useQuery } from "@tanstack/react-query"
import Chart from "chart.js/auto"
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { beszelSystemsQuery } from "./beszel"
import cn from "./components/lib/cn"
import { StatusSeverity, formatLineName, getLineColor, getStatusBorderColor, tflDisruptionsQuery } from "./tfl"
import {
	DEFAULT_LATITUDE,
	DEFAULT_LONGITUDE,
	currentWeatherQuery,
	dailyForecastQuery,
	getWeatherIcon,
	weatherDescriptionQuery,
} from "./weather"

function App() {
	return (
		<div className="h-screen bg-black gap-4 text-neutral-200 grid grid-cols-4 grid-rows-5 p-4">
			<DateTimeTile />
			<WeatherTile />
			<TFLTile />
			<SystemTile systemName="helian" displayName="Helian" />
			<SystemTile systemName="akira" displayName="Akira" />
		</div>
	)
}

function Tile({
	decorations = true,
	children,
	className,
}: { decorations?: boolean; children: React.ReactNode; className?: string }) {
	return (
		<div className={cn("relative bg-neutral-900 flex flex-col justify-end items-start", className)}>
			{decorations && (
				<>
					<div className="absolute top-0 left-0 w-4 h-[1px] bg-neutral-200" />
					<div className="absolute top-0 left-0 w-[1px] h-4 bg-neutral-200" />
					<div className="absolute bottom-0 right-0 w-4 h-[1px] bg-neutral-200" />
					<div className="absolute bottom-0 right-0 w-[1px] h-4 bg-neutral-200" />
				</>
			)}
			{children}
		</div>
	)
}

function DateTimeTile() {
	const [time, setTime] = useState(new Date())

	const formattedDate = time.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})
	const formattedTime = time.toLocaleTimeString("en-US", {
		hour12: false,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new Date())
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	return (
		<Tile className="col-start-1 row-start-1 col-span-2 row-span-3 p-6">
			<p className="text-4xl mb-2 font-extralight">{formattedDate}</p>
			<p className="text-8xl font-bold">{formattedTime}</p>
		</Tile>
	)
}

function WeatherTile() {
	const {
		data: currentWeatherData,
		isLoading: isLoadingCurrentWeather,
		error: errorCurrentWeather,
	} = useQuery({
		...currentWeatherQuery(DEFAULT_LATITUDE, DEFAULT_LONGITUDE),
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		refetchIntervalInBackground: true,
	})

	const {
		data: dailyForecastData,
		isLoading: isLoadingDailyForecast,
		error: errorDailyForecast,
	} = useQuery({
		...dailyForecastQuery(DEFAULT_LATITUDE, DEFAULT_LONGITUDE),
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		refetchIntervalInBackground: true,
	})

	const {
		data: weatherDescriptionData,
		isLoading: isLoadingWeatherDescription,
		error: errorWeatherDescription,
	} = useQuery({
		...weatherDescriptionQuery(DEFAULT_LATITUDE, DEFAULT_LONGITUDE),
		refetchInterval: 60 * 60 * 1000, // 1 hour
		refetchIntervalInBackground: true,
	})

	const isLoading = isLoadingCurrentWeather || isLoadingDailyForecast
	const error = errorCurrentWeather || errorDailyForecast

	if (isLoading) {
		return (
			<Tile className="col-start-1 h-full row-start-4 col-span-2 row-span-2 flex flex-row justify-center items-center p-8">
				<p className="text-2xl font-light animate-pulse">Loading weather</p>
			</Tile>
		)
	}

	if (error || !currentWeatherData?.currentWeather) {
		return (
			<Tile className="col-start-1 h-full row-start-4 col-span-2 row-span-2 flex flex-col justify-center items-center p-8">
				<p className="text-2xl text-red-400 font-light">Error loading weather</p>
				<p className=" text-neutral-400">{error?.message ?? "Unknown error"}</p>
			</Tile>
		)
	}

	const currentWeather = currentWeatherData.currentWeather
	const temperature = Math.round(currentWeather.temperature)
	const lowTemp = Math.round(dailyForecastData?.forecastDaily?.days[0].temperatureMin ?? 0)
	const highTemp = Math.round(dailyForecastData?.forecastDaily?.days[0].temperatureMax ?? 0)
	const percentage = lowTemp && highTemp ? (temperature - lowTemp) / (highTemp - lowTemp) : 0
	const highlightIndexStart = Math.floor((1 - percentage) * 23)
	const WeatherIcon = getWeatherIcon(currentWeather.conditionCode)

	let weatherDescriptionContent: string
	if (isLoadingWeatherDescription) {
		weatherDescriptionContent = "Loading weather description"
	} else if (errorWeatherDescription) {
		weatherDescriptionContent = `Error: ${errorWeatherDescription.message}`
	} else if (!weatherDescriptionData?.description) {
		weatherDescriptionContent = "No weather description available"
	} else {
		weatherDescriptionContent = weatherDescriptionData.description
	}

	return (
		<Tile className="col-start-1 h-full row-start-4 col-span-2 row-span-2 flex flex-row justify-start items-center p-8">
			<div className="flex flex-row h-full items-center space-x-2 flex-[2]">
				<div className="flex flex-col justify-between items-end h-full">
					<p className={cn("leading-none text-sm text-neutral-400", temperature === highTemp && "invisible")}>
						H:{highTemp}°
					</p>
					<p className={cn("leading-none text-sm text-neutral-400", temperature === lowTemp && "invisible")}>
						L:{lowTemp}°
					</p>
				</div>
				<div className="flex flex-col space-y-2 flex-[1]">
					{Array.from({ length: 24 }).map((_, index) => {
						if (index === highlightIndexStart) {
							return (
								<div className="relative w-fit">
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										key={index}
										className={cn("w-10 bg-teal-400 h-[2px]")}
									/>
									<div
										className={cn(
											"absolute flex flex-row items-center space-x-1 top-0 right-0 bg-teal-400 text-neutral-900 px-2 py-1 text-2xl font-bold rounded-r-sm translate-x-[calc(100%-1px)]",
											percentage < 0.3
												? "-translate-y-[calc(100%-2px)] rounded-tl-sm"
												: "rounded-bl-sm",
										)}
									>
										<p className="leading-none translate-y-px">{temperature}°</p>
										<WeatherIcon className="size-6" strokeWidth={3} />
									</div>
								</div>
							)
						}
						return (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								key={index}
								className={cn(
									"w-4",
									index >= highlightIndexStart
										? "bg-teal-400 w-8 h-[2px]"
										: "bg-neutral-400 w-4 h-[1px]",
								)}
							/>
						)
					})}
				</div>
				<div className="flex flex-col justify-start h-full space-y-2 flex-[2]">
					<p
						className={cn("text-3xl leading-none tracking-tight font-light", {
							"text-red-400": errorWeatherDescription,
							"animate-pulse": isLoadingWeatherDescription,
						})}
					>
						{weatherDescriptionContent}
					</p>
				</div>
			</div>
		</Tile>
	)
}

function TFLTile() {
	const {
		data: tflData,
		isLoading: isLoadingTFL,
		error: errorTFL,
	} = useQuery({
		...tflDisruptionsQuery(),
		select: (data) => {
			data.disruptions.sort((a, b) => {
				if (a.lineName.match(/northern/i)) return -1
				if (b.lineName.match(/northern/i)) return 1
				return a.statusSeverity - b.statusSeverity
			})
			return data
		},
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		refetchIntervalInBackground: true,
	})

	if (isLoadingTFL) {
		return (
			<Tile className="col-start-3 h-full row-start-1 col-span-2 row-span-1 flex flex-row justify-start items-center p-8">
				<p className="text-2xl font-light animate-pulse">Loading tube status</p>
			</Tile>
		)
	}

	if (errorTFL) {
		return (
			<Tile className="col-start-3 h-full row-start-1 col-span-2 row-span-1 flex flex-row justify-start items-center p-8">
				<p className="text-2xl font-light text-red-400">Error loading from TfL</p>
				<p className="text-neutral-400">{errorTFL?.message}</p>
			</Tile>
		)
	}

	if (!tflData) {
		return (
			<Tile className="col-start-3 h-full row-start-1 col-span-2 row-span-1 flex flex-row justify-start items-center p-8">
				<p className="text-2xl font-light">No TfL data available</p>
			</Tile>
		)
	}

	return (
		<Tile
			decorations={false}
			className="gap-x-1 col-start-3 h-full row-start-1 col-span-2 row-span-1 grid grid-cols-[min-content_1fr] auto-rows-min overflow-y-auto"
		>
			{tflData.goodService.includes("Northern") && (
				<>
					<TFLDistruptionItem lineId="northern" reason="Good service" severity={StatusSeverity.GoodService} />
					<hr className="col-span-2 border-neutral-700" />
				</>
			)}
			{tflData.disruptions.map((disruption, i) => (
				<Fragment key={disruption.lineId}>
					<TFLDistruptionItem
						lineId={disruption.lineId}
						reason={disruption.reason ?? "Unknown reason"}
						severity={disruption.statusSeverity}
					/>
					{i < tflData.disruptions.length - 1 && <hr className="col-span-2 border-neutral-700" />}
				</Fragment>
			))}
		</Tile>
	)
}

function TFLDistruptionItem({ lineId, reason, severity }: { lineId: string; reason: string; severity: number }) {
	const lineName = formatLineName(lineId)

	console.log(lineId)
	let lineStyleClass: string
	switch (lineId) {
		case "bakerloo":
			lineStyleClass = "bg-amber-700"
			break
		case "central":
			lineStyleClass = "bg-red-600"
			break
		case "circle":
			lineStyleClass = "bg-yellow-400 text-neutral-900"
			break
		case "district":
			lineStyleClass = "bg-green-600"
			break
		case "hammersmith-city":
			lineStyleClass = "bg-pink-400"
			break
		case "jubilee":
			lineStyleClass = "bg-slate-500"
			break
		case "metropolitan":
			lineStyleClass = "bg-purple-800"
			break
		case "northern":
			lineStyleClass = "bg-black"
			break
		case "piccadilly":
			lineStyleClass = "bg-blue-900"
			break
		case "victoria":
			lineStyleClass = "bg-sky-500"
			break
		case "waterloo-city":
			lineStyleClass = "bg-teal-500"
			break
		case "london-overground":
			lineStyleClass = "bg-orange-500"
			break
		case "dlr":
			lineStyleClass = "bg-teal-600"
			break
		case "elizabeth":
			lineStyleClass = "bg-purple-600"
			break
		case "tram":
			lineStyleClass = "bg-green-500"
			break
		default:
			lineStyleClass = "bg-gray-500"
			break
	}

	let statusBorderClass: string
	switch (severity) {
		case StatusSeverity.GoodService:
			statusBorderClass = "border-green-500"
			break
		case StatusSeverity.MinorDelays:
			statusBorderClass = "border-yellow-500"
			break
		case StatusSeverity.Suspended:
			statusBorderClass = "border-red-600"
			break
		case StatusSeverity.PartSuspended:
			statusBorderClass = "border-red-500"
			break
		case StatusSeverity.PlannedClosure:
			statusBorderClass = "border-orange-600"
			break
		case StatusSeverity.PartClosure:
			statusBorderClass = "border-yellow-500"
			break
		case StatusSeverity.SevereDelays:
			statusBorderClass = "border-red-500"
			break
		case StatusSeverity.ReducedService:
			statusBorderClass = "border-orange-500"
			break
		case StatusSeverity.BusService:
			statusBorderClass = "border-blue-500"
			break
		case StatusSeverity.Information:
			statusBorderClass = "border-blue-400"
			break
		case StatusSeverity.ServiceClosed:
			statusBorderClass = "border-red-700"
			break
		default:
			statusBorderClass = "border-gray-400"
			break
	}

	return (
		<>
			<div className="h-full flex items-center justify-center px-2 py-0.5">
				<p
					className={cn(
						"text-xl uppercase font-bold w-full text-center px-1 rounded-sm",
						lineStyleClass,
						statusBorderClass,
					)}
				>
					{lineName}
				</p>
			</div>
			<p
				className={cn(
					"text-xl text-wrap text-neutral-300 leading-tight self-center pr-2 py-1 font-light border-r-4",
					getStatusBorderColor(severity),
				)}
			>
				{reason}
			</p>
		</>
	)
}

function SystemTile({
	className,
	systemName,
	displayName,
}: { className?: string; systemName: string; displayName: string }) {
	const { data } = useQuery({
		...beszelSystemsQuery(),
		refetchInterval: 1000,
		refetchIntervalInBackground: true,
	})
	const chartRef = useRef<Chart | null>(null)

	const beszelSystemsData = data?.systems.find((system) => system.name === systemName)

	const onCanvasRef = (elem: HTMLCanvasElement | null) => {
		if (!elem || chartRef.current) return

		const fillGradient = elem?.getContext("2d")?.createLinearGradient(0, 0, 0, elem.height)
		fillGradient?.addColorStop(0, "#2dd4bf")
		fillGradient?.addColorStop(0.5, "rgba(45, 212, 191, 0)")
		fillGradient?.addColorStop(1, "rgba(45, 212, 191, 0)")
		chartRef.current = new Chart(elem, {
			type: "line",
			data: {
				labels: Array.from({ length: 20 }, (_, index) => index),
				datasets: [
					{
						data: Array.from({ length: 20 }, (_, i) => null),
						fill: true,
						backgroundColor: fillGradient,
						borderColor: "#2dd4bf",
						tension: 0.1,
					},
				],
			},
			options: {
				responsive: true,
				scales: {
					x: { display: false },
					y: { display: false, min: 0, max: 100 },
				},
				maintainAspectRatio: false,
				elements: {
					point: { radius: 0 },
					line: {
						backgroundColor: "rgba(255, 255, 255, 0.5)",
					},
				},
				plugins: {
					legend: {
						display: false,
					},
				},
			},
		})
	}

	useLayoutEffect(() => {
		const cpu = beszelSystemsData?.info.cpu
		if (!chartRef.current || cpu === undefined) return

		const dataset = chartRef.current.data.datasets[0]

		const nextData = Array.from({ length: 20 }, (_, i) => {
			if (i === 19) {
				return null
			}
			return dataset.data[i + 1]
		})
		nextData[19] = cpu

		dataset.data = nextData
		chartRef.current.update()
	})

	if (!beszelSystemsData) {
		return (
			<Tile className={cn("h-full row-start-2 flex flex-row justify-start items-center p-8", className)}>
				<p className="text-2xl font-light">No system status available</p>
			</Tile>
		)
	}

	return (
		<Tile
			decorations={false}
			className={cn("h-full row-start-2 flex flex-col justify-start items-start", className)}
		>
			<div className="grid grid-cols-6 px-4 pt-3 w-full">
				<div className="col-span-3 flex flex-row items-center space-x-2">
					<p className="text-2xl">{displayName}</p>
					<div className="size-2 border border-green-300 bg-green-500 rounded-full animate-pulse" />
				</div>
				<div className="flex flex-col font-mono">
					<p className="text-neutral-400 text-right leading-none">CPU</p>
					<p className="text-right">{beszelSystemsData.info.cpu.toFixed(0).padStart(3, "0")}</p>
				</div>
				<div className="flex flex-col font-mono">
					<p className="text-neutral-400 text-right leading-none">RAM</p>
					<p className="text-right">{beszelSystemsData.info.ram.toFixed(0).padStart(3, "0")}</p>
				</div>
				<div className="flex flex-col font-mono">
					<p className="text-neutral-400 text-right leading-none">DSK</p>
					<p className="text-right">{beszelSystemsData.info.disk.toFixed(0).padStart(3, "0")}</p>
				</div>
			</div>
			<div className="w-full flex-1 min-w-0 basis-0 relative mb-2">
				<canvas ref={onCanvasRef} className="min-h-0 absolute top-0 left-0 w-full h-full" />
			</div>
		</Tile>
	)
}

export default App
