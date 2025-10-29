import type { JrpcRequest, JrpcResponse } from "@eva/jrpc"
import { ZIGBEE_DEVICE, type ZigbeeDeviceName } from "@eva/zigbee"
import { useQuery } from "@tanstack/react-query"
import { useDrag } from "@use-gesture/react"
import Chart from "chart.js/auto"
import { atom, useAtomValue, useSetAtom, useStore } from "jotai"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { beszelSystemsQuery } from "./beszel"
import cn from "./components/lib/cn"
import { StatusSeverity, TubeLine, formatLineName, tflDisruptionsQuery } from "./tfl"
import {
	DEFAULT_LATITUDE,
	DEFAULT_LONGITUDE,
	currentWeatherQuery,
	dailyForecastQuery,
	getWeatherIcon,
	weatherDescriptionQuery,
} from "./weather"

const brightnessAtoms = atom({
	[ZIGBEE_DEVICE.deskLamp]: atom(0),
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: atom(0),
})

const intermediateBrightnessAtoms = atom({
	[ZIGBEE_DEVICE.deskLamp]: atom(-1),
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: atom(-1),
})

function App() {
	const websocket = useRef(new WebSocket(`ws://${import.meta.env.VITE_API_HOST}/api/zigbee`))

	const store = useStore()

	useEffect(() => {
		websocket.current.onmessage = (event) => {
			const data = JSON.parse(event.data) as JrpcRequest | JrpcResponse
			if ("method" in data) {
				switch (data.method) {
					case "showDeviceState": {
						const { deviceName, state } = data.params
						const brightnessAtom = store.get(brightnessAtoms)[deviceName]
						store.set(brightnessAtom, Math.round((state.brightness / 254) * 100))
					}
				}
			}
		}
		return () => {
			if (websocket.current.readyState === WebSocket.OPEN) {
				websocket.current.close()
			}
		}
	}, [store])

	function setBrightness(deviceName: ZigbeeDeviceName, brightness: number) {
		const request: JrpcRequest<"setDeviceState"> = {
			id: crypto.randomUUID(),
			jsonrpc: "2.0",
			method: "setDeviceState",
			params: {
				deviceName,
				state:
					brightness === 0
						? { state: "OFF", brightness: 0 }
						: { state: "ON", brightness: Math.round((brightness / 100) * 254) },
			},
		}
		websocket.current.send(JSON.stringify(request))
	}

	return (
		<div className="h-screen bg-neutral-300 dark:bg-neutral-800 p-2 select-none">
			<div className="w-full h-full grid grid-cols-4 grid-rows-5 gap-2 bg-neutral-300 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
				<DateTimeTile />
				<WeatherTile />

				<TFLTile className="row-start-1 row-span-1" />

				<SystemTile className="row-start-2 row-span-1" systemName="helian" displayName="Helian" />
				<SystemTile className="row-start-2 row-span-1" systemName="akira" displayName="Akira" />

				<LightControlTile
					className="row-start-3 col-start-3 col-span-1"
					deviceName={ZIGBEE_DEVICE.livingRoomFloorLamp}
					onRequestBrightnessChange={(brightness) => {
						setBrightness(ZIGBEE_DEVICE.livingRoomFloorLamp, brightness)
					}}
				/>
				<LightControlTile
					className="row-start-3 col-start-4 col-span-1"
					deviceName={ZIGBEE_DEVICE.deskLamp}
					onRequestBrightnessChange={(brightness) => {
						setBrightness(ZIGBEE_DEVICE.deskLamp, brightness)
					}}
				/>

				<Tile className="row-start-4 col-span-2 row-span-3" />
			</div>
		</div>
	)
}

function Tile({ children, className }: { children?: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"relative rounded-xl bg-neutral-200 dark:bg-neutral-900 flex flex-col justify-end items-start",
				className,
			)}
		>
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
			<p className="text-4xl mb-2 font-mono uppercase tracking-tigher">{formattedDate}</p>
			<p className="text-8xl font-extralight tracking-tight">{formattedTime}</p>
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
										className={cn("w-10 bg-teal-500 dark:bg-teal-400 h-[2px]")}
									/>
									<div
										className={cn(
											"absolute flex flex-row items-center space-x-1 top-0 right-0 bg-teal-500 dark:bg-teal-400 text-neutral-200 dark:text-neutral-900 px-2 py-1 text-4xl font-bold rounded-r translate-x-[calc(100%-1px)]",
											percentage < 0.3
												? "-translate-y-[calc(100%-2px)] rounded-tl"
												: "rounded-bl",
										)}
									>
										<p className="leading-none translate-y-px">{temperature}°</p>
										<WeatherIcon className="size-8" strokeWidth={3} />
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
										? "bg-teal-500 dark:bg-teal-400 w-8 h-[2px]"
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

function TFLTile({ className }: { className?: string }) {
	const linesIDontCareAbout = [
		TubeLine.WaterlooCity,
		TubeLine.Windrush,
		TubeLine.Lioness,
		TubeLine.Lioness,
		TubeLine.Tram,
		TubeLine.Mildmay,
	]

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
			data.disruptions = data.disruptions.filter((disruption) => !linesIDontCareAbout.includes(disruption.lineId))
			return data
		},
		refetchInterval: 5 * 60 * 1000, // 5 minutes
		refetchIntervalInBackground: true,
	})

	if (isLoadingTFL) {
		return (
			<Tile
				className={cn("h-full col-span-2 row-span-1 flex flex-row justify-start items-center p-8", className)}
			>
				<p className="text-2xl font-light animate-pulse">Loading tube status</p>
			</Tile>
		)
	}

	if (errorTFL) {
		return (
			<Tile
				className={cn("h-full col-span-2 row-span-1 flex flex-row justify-start items-center p-8", className)}
			>
				<p className="text-2xl font-light text-red-400">Error loading from TfL</p>
				<p className="text-neutral-400">{errorTFL?.message}</p>
			</Tile>
		)
	}

	if (!tflData) {
		return (
			<Tile
				className={cn("h-full col-span-2 row-span-1 flex flex-row justify-start items-center p-8", className)}
			>
				<p className="text-2xl font-light">No TfL data available</p>
			</Tile>
		)
	}

	return (
		<Tile
			className={cn(
				"gap-x-1 pt-1 h-full col-span-2 row-span-1 grid grid-cols-[min-content_1fr] auto-rows-min overflow-y-auto",
				className,
			)}
		>
			{tflData.goodService.includes("Northern") && (
				<TFLDistruptionItem
					lineId={TubeLine.Northern}
					reason="Good service"
					severity={StatusSeverity.GoodService}
				/>
			)}
			{tflData.disruptions.map((disruption) => (
				<TFLDistruptionItem
					key={disruption.lineId}
					lineId={disruption.lineId}
					reason={disruption.reason ?? "Unknown reason"}
					severity={disruption.statusSeverity}
				/>
			))}
		</Tile>
	)
}

function TFLDistruptionItem({ lineId, reason, severity }: { lineId: TubeLine; reason: string; severity: number }) {
	const lineName = formatLineName(lineId)

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
						"text-neutral-200 text-xl uppercase font-bold w-full text-center px-1 rounded-lg",
						lineStyleClass,
					)}
				>
					{lineName}
				</p>
			</div>
			<p
				className={cn(
					"text-xl text-wrap leading-tight self-center pr-2 py-1.5 font-light border-r-4",
					statusBorderClass,
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
			<Tile className={cn("h-full flex flex-row justify-start items-center p-8", className)}>
				<p className="text-2xl font-light">No system status available</p>
			</Tile>
		)
	}

	return (
		<Tile className={cn("h-full flex flex-col justify-start items-start", className)}>
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

function LightControlTile({
	deviceName,
	className,
	onRequestBrightnessChange,
}: { deviceName: ZigbeeDeviceName; className?: string; onRequestBrightnessChange: (brightness: number) => void }) {
	const BAR_COUNT = 44

	const currentBrightness = useAtomValue(useAtomValue(brightnessAtoms)[deviceName])
	const initialHighlightIndexStart = Math.floor((1 - currentBrightness / 100) * BAR_COUNT)
	const touchContainerRef = useRef<HTMLDivElement | null>(null)
	const barRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: BAR_COUNT }, () => null))
	const setIntermediateBrightness = useSetAtom(useAtomValue(intermediateBrightnessAtoms)[deviceName])
	const store = useStore()

	const bind = useDrag(({ xy: [x], first, last }) => {
		if (!touchContainerRef.current) return

		if (!first) {
			touchContainerRef.current.dataset.active = "true"
		}

		if (last) {
			delete touchContainerRef.current.dataset.active
			for (let i = 0; i < BAR_COUNT; i++) {
				const bar = barRefs.current[i]
				if (!bar) continue

				if (bar.dataset.touched === "true") {
					bar.dataset.thumb = "true"
				} else {
					bar.dataset.thumb = "false"
				}

				bar.dataset.touched = "false"

				delete bar.dataset.touchProximity
			}

			const intermediateBrightness = store.get(store.get(intermediateBrightnessAtoms)[deviceName])
			if (intermediateBrightness !== -1) {
				onRequestBrightnessChange(intermediateBrightness)
				setIntermediateBrightness(-1)
			}
		} else {
			let touchedIndex = -1
			for (let i = 0; i < BAR_COUNT; i++) {
				const bar = barRefs.current[i]
				if (!bar) continue

				const barRect = bar.getBoundingClientRect()

				delete bar.dataset.thumb

				if (x > barRect.left - 2 && x < barRect.right + 2 && touchedIndex === -1) {
					touchedIndex = i

					bar.dataset.touched = "true"
					bar.dataset.highlighted = "false"
					delete bar.dataset.touchProximity

					const brightness = 1 - i / BAR_COUNT
					setIntermediateBrightness(Math.round(brightness * 100))

					if (barRefs.current[i - 1]) {
						barRefs.current[i - 1]!.dataset.touchProximity = "close"
					}
					if (barRefs.current[i - 2]) {
						barRefs.current[i - 2]!.dataset.touchProximity = "medium"
					}
					if (barRefs.current[i - 3]) {
						barRefs.current[i - 3]!.dataset.touchProximity = "far"
					}
				} else if (barRect.left < x) {
					if (bar.dataset.touched === "true") {
						bar.dataset.prevTouched = "true"
					} else {
						delete bar.dataset.prevTouched
					}
					bar.dataset.touched = "false"
					bar.dataset.highlighted = "true"
					if (touchedIndex >= 0) {
						const diff = i - touchedIndex
						if (diff === 1) {
							bar.dataset.touchProximity = "close"
						} else if (diff === 2) {
							bar.dataset.touchProximity = "medium"
						} else if (diff === 3) {
							bar.dataset.touchProximity = "far"
						} else {
							delete bar.dataset.touchProximity
						}
					} else {
						delete bar.dataset.touchProximity
					}
				} else if (barRect.right > x) {
					bar.dataset.highlighted = "false"
					bar.dataset.touched = "false"
					if (touchedIndex >= 0) {
						const diff = i - touchedIndex
						if (diff === 1) {
							bar.dataset.touchProximity = "close"
						} else if (diff === 2) {
							bar.dataset.touchProximity = "medium"
						} else if (diff === 3) {
							bar.dataset.touchProximity = "far"
						} else {
							delete bar.dataset.touchProximity
						}
					} else {
						delete bar.dataset.touchProximity
					}
				} else {
					bar.dataset.touched = "false"
					bar.dataset.highlighted = "false"
					delete bar.dataset.touchProximity
				}
			}

			if (touchedIndex === -1) {
				const firstElement = barRefs.current[barRefs.current.length - 1]
				const lastElement = barRefs.current[0]
				if (lastElement && x > lastElement.getBoundingClientRect().right) {
					lastElement.dataset.thumb = "true"
					setIntermediateBrightness(100)
				} else if (firstElement && x < firstElement.getBoundingClientRect().left) {
					setIntermediateBrightness(0)
				}
			}
		}
	})

	return (
		<Tile className={cn("h-full flex flex-col justify-start items-start", className)}>
			<div
				{...bind()}
				ref={touchContainerRef}
				className="group flex-1 flex flex-row-reverse justify-center items-center touch-none gap-x-1 w-full translate-y-6"
			>
				{Array.from({ length: BAR_COUNT }).map((_, index) => {
					const highlighted = index >= initialHighlightIndexStart
					return (
						<div
							data-highlighted={highlighted}
							data-thumb={index === initialHighlightIndexStart}
							data-touched={false}
							ref={(ref) => {
								barRefs.current[index] = ref
							}}
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							key={index}
							className="transition-all transition-75 w-[2px] h-[2px] bg-neutral-400 rounded-full data-[highlighted=true]:h-2 data-[touch-proximity=close]:h-6 data-[touch-proximity=medium]:h-4 data-[touch-proximity=far]:h-2 data-[highlighted=true]:bg-teal-500 data-[touched=true]:h-8 data-[touched=true]:w-1 data-[touched=true]:bg-teal-500 data-[touched=true]:transition-none data-[prev-touched=true]:transition-none data-[thumb=true]:h-8 data-[thumb=true]:bg-teal-500"
						/>
					)
				})}
			</div>
			<div className="px-4 pb-2 w-full flex flex-row items-center justify-center space-x-2">
				<p className="tracking-tigher uppercase">Desk light</p>
				<BrightnessLevelLabel deviceName={deviceName} />
			</div>
		</Tile>
	)
}

function BrightnessLevelLabel({ deviceName }: { deviceName: ZigbeeDeviceName }) {
	const currentBrightness = useAtomValue(useAtomValue(brightnessAtoms)[deviceName])
	const intermediateBrightness = useAtomValue(useAtomValue(intermediateBrightnessAtoms)[deviceName])

	const brightness = intermediateBrightness === -1 ? currentBrightness : intermediateBrightness

	let label: string
	if (brightness === 0) {
		label = "OFF"
	} else {
		label = `${brightness}%`
	}

	return (
		<p
			className={cn(
				"flex-1 text-right font-bold font-mono tracking-tigher",
				brightness === 0 ? "text-neutral-400" : "text-teal-400",
			)}
		>
			{label}
		</p>
	)
}

export default App
