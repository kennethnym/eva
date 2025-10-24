import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import cn from "./components/lib/cn"
import { StatusSeverity, getLineColor, getStatusBorderColor, tflDisruptionsQuery } from "./tfl"
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
				<div className="flex flex-col justify-start h-full space-y-2 flex-[3]">
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
				return a.statusSeverity - b.statusSeverity
			})
			return data
		},
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		refetchIntervalInBackground: true,
	})

	if (isLoadingTFL) {
		return (
			<Tile className="col-start-3 h-full row-start-1 col-span-2 row-span-2 flex flex-row justify-start items-center p-8">
				<p className="text-2xl font-light animate-pulse">Loading TfL</p>
			</Tile>
		)
	}

	return (
		<Tile
			decorations={false}
			className="gap-x-1 col-start-3 h-full row-start-1 col-span-2 row-span-1 grid grid-cols-[min-content_1fr] auto-rows-min overflow-y-auto"
		>
			{tflData?.goodService.includes("Northern") && (
				<TFLDistruptionItem
					lineId="northern"
					lineName="Northern"
					reason="Good service"
					severity={StatusSeverity.GoodService}
				/>
			)}
			{tflData?.disruptions.map((disruption) => (
				<>
					<TFLDistruptionItem
						key={disruption.lineId}
						lineId={disruption.lineId}
						lineName={disruption.lineName}
						reason={disruption.reason ?? "Unknown reason"}
						severity={disruption.statusSeverity}
					/>
					<hr className="col-span-2 border-neutral-700" />
				</>
			))}
		</Tile>
	)
}

function TFLDistruptionItem({
	lineId,
	lineName,
	reason,
	severity,
}: { lineId: string; lineName: string; reason: string; severity: number }) {
	return (
		<>
			<div className="h-full flex items-center justify-center px-2 py-0.5">
				<p
					className={cn(
						"text-xl uppercase font-bold bg-blue-500 w-full text-center px-1 rounded-sm",
						getLineColor(lineId),
						getStatusBorderColor(severity),
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

export default App
