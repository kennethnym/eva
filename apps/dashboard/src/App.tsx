import { type JrpcRequest, type JrpcResponse, newJrpcRequestId } from "@eva/jrpc"
import { ZIGBEE_DEVICE, type ZigbeeDeviceName } from "@eva/zigbee"
import { useQuery } from "@tanstack/react-query"
import Chart from "chart.js/auto"
import { useStore } from "jotai"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { beszelSystemsQuery } from "./beszel"
import cn from "./components/lib/cn"
import { Tile } from "./components/tile"
import { Kuromi } from "./kuromi"
import {
	LightControlTile,
	type LightSceneConfig,
	LightSceneTile,
	brightnessStepAtoms,
	brightnessToStep,
	stepToBrightness,
} from "./light-control"
import { StatusSeverity, TubeLine, formatLineName, tflDisruptionsQuery } from "./tfl"
import { useAutoTheme } from "./use-auto-theme"
import {
	DEFAULT_LATITUDE,
	DEFAULT_LONGITUDE,
	currentWeatherQuery,
	dailyForecastQuery,
	getWeatherIcon,
	weatherDescriptionQuery,
} from "./weather"

const kuromi = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣀⢠⠋⠉⠉⠒⠲⢤⣀⣠⡀
⠀⠀⠀⠀⠀⠀⣀⣀⣀⢀⡠⠖⠋⠉⠀⠀⠀⠀⠉⠉⠢⣄⠀⠀⠀⢀⠼⠤⠇
⠀⠀⠀⣀⠔⠊⠁⠀⢨⠏⠀⠀⠀⣠⣶⣶⣦⠀⠀⠀⠀⠀⠱⣄⡴⠃⠀⠀⠀⠀
⢸⣉⠿⣁⠀⠀⠀⢀⡇⠀⠀⠀⠀⢿⣽⣿⣼⡠⠤⢄⣀⠀⠀⢱⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠑⢦⡀⢸⠀⠀⠀⡠⠒⠒⠚⠛⠉⠀⢠⣀⡌⠳⡀⡌⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠉⠉⣆⠀⢰⠁⣀⣀⠀⠀⣀⠀⠈⡽⣧⢀⡷⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⡤⢄⠀⠈⠢⣸⣄⢽⣞⡂⠀⠈⠁⣀⡜⠁⣩⡷⠿⠆⠀⠀⠀⠀⠀
⠀⠀⠀⠀⢯⣁⡸⠀⠀⠀⡬⣽⣿⡀⠙⣆⡸⠛⠠⢧⠀⡿⠯⠆⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣀⡀⠀⠀⡤⠤⣵⠁⢸⣻⡤⠏⠀⠀⠀⠀⢹⠀⠀⠀⡊⠱⣀⠀⠀⠀
⠀⠀⢀⠜⠀⢘⠀⠀⠱⠲⢜⣢⣤⣧⠀⠀⠀⠀⠀⢴⠇⠀⠀⠀⠧⠠⠜⠀⠀⠀
⠀⠀⠘⠤⠤⠚⠀⠀⠀⠀⠀⠀⢸⠁⠁⠀⣀⠎⠀⠻⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠣⣀⣀⡴⠤⠄⠴⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
`

function App() {
	const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
	const wsHost = import.meta.env.VITE_API_HOST || window.location.host
	const websocket = useRef(new WebSocket(`${wsProtocol}//${wsHost}/api/zigbee`))

	const store = useStore()

	useAutoTheme(DEFAULT_LATITUDE, DEFAULT_LONGITUDE)

	useEffect(() => {
		const ws = websocket.current

		ws.onopen = () => {
			console.log("WebSocket connected")
		}

		ws.onerror = (error) => {
			console.error("WebSocket error:", error)
		}

		ws.onclose = () => {
			console.log("WebSocket disconnected")
		}

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data) as JrpcRequest | JrpcResponse
			if ("method" in data) {
				switch (data.method) {
					case "showDeviceState": {
						const { deviceName, state } = data.params
						const brightnessStepAtom = store.get(brightnessStepAtoms)[deviceName]
						store.set(brightnessStepAtom, brightnessToStep(state.brightness))
					}
				}
			}
		}

		return () => {
			if (ws.readyState === WebSocket.OPEN) {
				ws.close()
			}
		}
	}, [store])

	function setBrightnessStep(deviceName: ZigbeeDeviceName, step: number) {
		const ws = websocket.current

		if (ws.readyState !== WebSocket.OPEN) {
			console.warn("WebSocket is not open. Current state:", ws.readyState)
			return
		}

		const brightness = stepToBrightness(step)

		const req: JrpcRequest<"setDeviceState"> = {
			id: newJrpcRequestId(),
			jsonrpc: "2.0",
			method: "setDeviceState",
			params: {
				deviceName,
				state: step === 0 ? { state: "OFF", brightness: 0 } : { state: "ON", brightness },
			},
		}

		ws.send(JSON.stringify(req))
	}

	function setScene(scene: LightSceneConfig) {
		const ws = websocket.current
		for (const [deviceName, state] of Object.entries(scene.deviceStates)) {
			const req: JrpcRequest<"setDeviceState"> = {
				id: newJrpcRequestId(),
				jsonrpc: "2.0",
				method: "setDeviceState",
				params: {
					deviceName: deviceName as ZigbeeDeviceName,
					state,
				},
			}
			ws.send(JSON.stringify(req))
		}
	}

	return (
		<div className="h-screen bg-neutral-300 dark:bg-neutral-800 p-2 select-none">
			<div className="w-full h-full grid grid-cols-4 grid-rows-5 gap-2 bg-neutral-300 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
				<DateTimeTile />
				<WeatherTile />

				<TFLTile className="row-start-1 row-span-1" />

				<SystemTile className="row-start-2 row-span-1" systemName="helian" displayName="Helian" />
				<SystemTile className="row-start-2 row-span-1" systemName="akira" displayName="Akira" />

				<LightSceneTile
					className="row-start-3 col-start-3 col-span-1 row-span-2"
					onSceneChange={(scene) => {
						setScene(scene)
					}}
				/>

				<LightControlTile
					className="row-start-3 col-start-4 col-span-1"
					deviceName={ZIGBEE_DEVICE.livingRoomFloorLamp}
					onRequestBrightnessStepChange={(step) => {
						setBrightnessStep(ZIGBEE_DEVICE.livingRoomFloorLamp, step)
					}}
				/>
				<LightControlTile
					className="row-start-4 col-start-4 col-span-1"
					deviceName={ZIGBEE_DEVICE.deskLamp}
					onRequestBrightnessStepChange={(step) => {
						setBrightnessStep(ZIGBEE_DEVICE.deskLamp, step)
					}}
				/>

				<Tile className="row-start-5 col-start-3 col-span-2 row-span-1 flex items-center justify-center overflow-hidden">
					<Kuromi />
				</Tile>
			</div>
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
	// Calculate percentage: handle case where lowTemp might be 0 (falsy) by checking for valid numbers
	const tempRange = highTemp - lowTemp
	const percentage = tempRange !== 0 && !Number.isNaN(tempRange)
		? Math.max(0, Math.min(1, (temperature - lowTemp) / tempRange))
		: 0
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
				<div className="flex flex-col space-y-2 flex-[2]">
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
				<div className="flex flex-col justify-start h-full space-y-2 flex-[3]">
					<p
						className={cn("text-3xl leading-none tracking-tight font-light pl-4", {
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
				"pt-1 h-full col-span-2 row-span-1 grid grid-cols-[min-content_1fr] auto-rows-min overflow-y-auto",
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
			lineStyleClass = "bg-black text-neutral-200 dark:bg-neutral-200 dark:text-black"
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
						"text-neutral-200 text-sm uppercase w-full text-center px-1 rounded-lg",
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

		const cpuFillGradient = elem?.getContext("2d")?.createLinearGradient(0, 0, 0, elem.height)
		cpuFillGradient?.addColorStop(0, "#2dd4bf")
		cpuFillGradient?.addColorStop(0.5, "rgba(45, 212, 191, 0)")
		cpuFillGradient?.addColorStop(1, "rgba(45, 212, 191, 0)")

		const ramFillGradient = elem?.getContext("2d")?.createLinearGradient(0, 0, 0, elem.height)
		ramFillGradient?.addColorStop(0, "#a78bfa")
		ramFillGradient?.addColorStop(0.5, "rgba(167, 139, 250, 0)")
		ramFillGradient?.addColorStop(1, "rgba(167, 139, 250, 0)")

		chartRef.current = new Chart(elem, {
			type: "line",
			data: {
				labels: Array.from({ length: 20 }, (_, index) => index),
				datasets: [
					{
						data: Array.from({ length: 20 }, (_, __) => null),
						fill: true,
						backgroundColor: cpuFillGradient,
						borderColor: "#2dd4bf",
						tension: 0.1,
					},
					{
						data: Array.from({ length: 20 }, (_, __) => null),
						fill: true,
						backgroundColor: ramFillGradient,
						borderColor: "#a78bfa",
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
		const ram = beszelSystemsData?.info.ram
		if (!chartRef.current || cpu === undefined || ram === undefined) return

		const cpuDataset = chartRef.current.data.datasets[0]
		const ramDataset = chartRef.current.data.datasets[1]

		const nextCpuData = Array.from({ length: 20 }, (_, i) => {
			if (i === 19) {
				return null
			}
			return cpuDataset.data[i + 1]
		})
		nextCpuData[19] = cpu

		const nextRamData = Array.from({ length: 20 }, (_, i) => {
			if (i === 19) {
				return null
			}
			return ramDataset.data[i + 1]
		})
		nextRamData[19] = ram

		cpuDataset.data = nextCpuData
		ramDataset.data = nextRamData
		chartRef.current.update()
	})

	if (!beszelSystemsData) {
		return (
			<Tile className={cn("h-full flex flex-row justify-start items-center p-8", className)}>
				<p className="text-2xl font-light">No system status available</p>
			</Tile>
		)
	}

	let systemStatusContent: React.ReactNode
	switch (beszelSystemsData.status) {
		case "up":
			systemStatusContent = (
				<div className="w-full flex-1 min-w-0 basis-0 relative mb-2">
					<canvas ref={onCanvasRef} className="min-h-0 absolute top-0 left-0 w-full h-full" />
				</div>
			)
			break

		case "down":
			systemStatusContent = (
				<div className="w-full flex-1 flex items-center justify-center">
					<p className="font-mono text-red-500 uppercase font-bold">System offline</p>
				</div>
			)
			break
	}

	return (
		<Tile className={cn("h-full flex flex-col justify-start items-start", className)}>
			<div className="grid grid-cols-6 px-3 pt-2 w-full">
				<div className="col-span-3 self-start flex flex-row items-center space-x-2">
					<p className="leading-none tracking-tight text-2xl">{displayName}</p>
					<div
						className={cn("size-2 border rounded-full", {
							"animate-pulse border-green-300 bg-green-500": beszelSystemsData.status === "up",
							"border-red-300 bg-red-500": beszelSystemsData.status === "down",
						})}
					/>
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
			{systemStatusContent}
		</Tile>
	)
}

export default App
